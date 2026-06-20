"use strict";
const electron = require("electron");
const path = require("path");
const rest = require("@octokit/rest");
const fs = require("fs");
class GitHubClient {
  octokit;
  constructor(token) {
    this.octokit = new rest.Octokit({ auth: token });
  }
  async getAuthenticatedUser() {
    const { data } = await this.octokit.users.getAuthenticated();
    return data.login;
  }
  async listRepos() {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "pushed"
    });
    return data.map((r) => r.full_name);
  }
  async getFeatureFlows(repo) {
    const [owner, repoName] = repo.split("/");
    const me = await this.getAuthenticatedUser().catch(() => "");
    const [openPRs, closedPRs] = await Promise.all([
      this.octokit.pulls.list({ owner, repo: repoName, state: "open", per_page: 30, sort: "updated", direction: "desc" }),
      this.octokit.pulls.list({ owner, repo: repoName, state: "closed", per_page: 5, sort: "updated", direction: "desc" })
    ]);
    const prs = [...openPRs.data, ...closedPRs.data.filter((p) => p.merged_at)];
    const flows = await Promise.all(prs.map((pr) => this.prToFlow(pr, owner, repoName, me)));
    return flows.filter((f) => f !== null);
  }
  async prToFlow(pr, owner, repo, me) {
    try {
      const needsAttention = [];
      const prUrl = pr.html_url;
      const headSha = pr.head.sha;
      const mergeCommitSha = pr.merge_commit_sha ?? void 0;
      const isBot = (pr.user?.login.toLowerCase().includes("copilot") ?? false) || pr.user?.type === "Bot";
      const workStage = {
        id: "work",
        state: "done",
        summary: "authored",
        url: prUrl,
        satellites: [{
          id: `agent-${pr.number}`,
          kind: "agent",
          label: isBot ? "Copilot Agent" : pr.user?.login ?? "author",
          status: "passed",
          url: prUrl
        }]
      };
      const prStage = {
        id: "pr",
        state: "done",
        summary: `#${pr.number}`,
        url: prUrl,
        satellites: []
      };
      const checksStage = await this.buildChecksStage(owner, repo, headSha, prUrl, needsAttention);
      const requestedReviewers = (pr.requested_reviewers ?? []).filter(Boolean);
      const reviewStage = await this.buildReviewStage(owner, repo, pr.number, requestedReviewers, prUrl, me, needsAttention);
      const mergeableState = pr.mergeable_state ?? "";
      if (mergeableState === "dirty" || mergeableState === "conflicting") {
        needsAttention.push({ reason: "merge_conflict", stage: "merge", url: prUrl });
      }
      const isFullyMerged = !!pr.merged_at;
      const mergeStage = {
        id: "merge",
        state: isFullyMerged ? "done" : mergeableState === "clean" ? "active" : "pending",
        summary: isFullyMerged ? "merged" : mergeableState === "clean" ? "ready" : mergeableState === "dirty" ? "conflict" : void 0,
        url: prUrl,
        satellites: []
      };
      const [deployStage, prodStage] = mergeCommitSha ? await this.buildDeployStages(owner, repo, mergeCommitSha, needsAttention) : [noData("deploy"), noData("prod")];
      return {
        id: `${owner}-${repo}-${pr.number}`,
        title: pr.title,
        branch: pr.head.ref,
        headSha,
        mergeCommitSha,
        repo: `${owner}/${repo}`,
        stages: [workStage, prStage, checksStage, reviewStage, mergeStage, deployStage, prodStage],
        needsAttention,
        updatedAt: pr.updated_at
      };
    } catch {
      return null;
    }
  }
  async buildChecksStage(owner, repo, sha, prUrl, needsAttention) {
    try {
      const { data } = await this.octokit.checks.listForRef({ owner, repo, ref: sha, per_page: 100 });
      const runs = data.check_runs;
      if (!runs.length) return noData("checks");
      let passed = 0;
      let failedUrl;
      let anyInProgress = false;
      for (const run of runs) {
        if (run.conclusion === "success" || run.conclusion === "skipped" || run.conclusion === "neutral") {
          passed++;
        } else if (run.conclusion === "failure" || run.conclusion === "timed_out" || run.conclusion === "cancelled") {
          failedUrl ??= run.details_url ?? run.html_url ?? void 0;
        }
        if (run.status === "in_progress" || run.status === "queued") anyInProgress = true;
      }
      const state = failedUrl ? "failed" : anyInProgress ? "active" : passed === runs.length ? "done" : "pending";
      if (failedUrl) needsAttention.push({ reason: "check_failed", stage: "checks", url: failedUrl });
      return {
        id: "checks",
        state,
        summary: `${passed}/${runs.length}`,
        url: `https://github.com/${owner}/${repo}/actions`,
        logUrl: failedUrl,
        satellites: []
      };
    } catch {
      return noData("checks");
    }
  }
  async buildReviewStage(owner, repo, prNumber, requested, prUrl, me, needsAttention) {
    try {
      const iAmRequested = requested.some((r) => r.login === me);
      if (iAmRequested) needsAttention.push({ reason: "review_requested", stage: "review", url: `${prUrl}/files` });
      const { data: reviews } = await this.octokit.pulls.listReviews({ owner, repo, pull_number: prNumber });
      const satellites = [];
      let anyApproved = false;
      let anyChangesRequested = false;
      const perUser = /* @__PURE__ */ new Map();
      for (const r of reviews) if (r.user) perUser.set(r.user.login, r);
      for (const [login, review] of perUser) {
        const isBot = login.toLowerCase().includes("copilot");
        const reviewUrl = review.html_url;
        if (review.state === "APPROVED") {
          anyApproved = true;
          if (isBot) satellites.push({ id: `air-${prNumber}`, kind: "ai_review", label: "Copilot Review", status: "passed", url: reviewUrl });
        } else if (review.state === "CHANGES_REQUESTED") {
          anyChangesRequested = true;
          needsAttention.push({ reason: "changes_requested", stage: "review", url: reviewUrl });
          if (isBot) satellites.push({ id: `air-cr-${prNumber}`, kind: "ai_review", label: "Copilot Review", status: "failed", url: reviewUrl });
        }
      }
      const copilotPending = requested.some((r) => r.login.toLowerCase().includes("copilot"));
      if (copilotPending) satellites.push({ id: `air-p-${prNumber}`, kind: "ai_review", label: "Copilot Review", status: "running", url: prUrl });
      return {
        id: "review",
        state: anyChangesRequested ? "failed" : anyApproved ? "done" : iAmRequested || requested.length > 0 ? "active" : "pending",
        summary: anyChangesRequested ? "changes" : anyApproved ? "approved" : iAmRequested ? "you" : requested.length ? "pending" : void 0,
        url: prUrl,
        satellites
      };
    } catch {
      return { id: "review", state: "pending", url: prUrl, satellites: [] };
    }
  }
  async buildDeployStages(owner, repo, sha, needsAttention) {
    try {
      const { data: deployments } = await this.octokit.repos.listDeployments({ owner, repo, sha, per_page: 30 });
      if (!deployments.length) return [noData("deploy"), noData("prod")];
      const nonProdSats = [];
      const prodSats = [];
      let deployState = "no_data";
      let prodState = "no_data";
      let deploySummary;
      let prodSummary;
      let deployLogUrl;
      let prodLogUrl;
      for (const dep of deployments) {
        const env = dep.environment;
        const isProd = env.toLowerCase().includes("prod");
        const { data: statuses } = await this.octokit.repos.listDeploymentStatuses({
          owner,
          repo,
          deployment_id: dep.id,
          per_page: 1
        });
        const latest = statuses[0];
        const statusState = latest?.state ?? "pending";
        const logUrl = latest?.log_url ?? latest?.target_url ?? void 0;
        let satStatus;
        let stageState;
        let summary;
        switch (statusState) {
          case "success":
            satStatus = "passed";
            stageState = "done";
            summary = "success";
            break;
          case "failure":
          case "error":
            satStatus = "failed";
            stageState = "failed";
            summary = "failed";
            needsAttention.push({ reason: "deploy_failed", stage: isProd ? "prod" : "deploy", url: logUrl ?? dep.url });
            break;
          case "in_progress":
            satStatus = "running";
            stageState = "active";
            summary = "deploying";
            break;
          case "waiting":
            satStatus = "waiting";
            stageState = "active";
            summary = "waiting";
            needsAttention.push({ reason: "deploy_waiting_approval", stage: isProd ? "prod" : "deploy", url: dep.url });
            break;
          default:
            satStatus = "waiting";
            stageState = "active";
            summary = statusState;
        }
        const sat = { id: `env-${env}-${dep.id}`, kind: "environment", label: env, status: satStatus, url: dep.url };
        if (isProd) {
          prodState = stageState;
          prodSummary = summary;
          prodLogUrl = logUrl;
          prodSats.push(sat);
        } else {
          deployState = stageState;
          deploySummary = summary;
          deployLogUrl = logUrl;
          nonProdSats.push(sat);
        }
      }
      return [
        { id: "deploy", state: deployState, summary: deploySummary, satellites: nonProdSats, logUrl: deployLogUrl },
        { id: "prod", state: prodState, summary: prodSummary, satellites: prodSats, logUrl: prodLogUrl }
      ];
    } catch {
      return [noData("deploy"), noData("prod")];
    }
  }
}
function noData(id) {
  return { id, state: "no_data", satellites: [] };
}
function getStorePath() {
  return path.join(electron.app.getPath("userData"), "throughline-settings.json");
}
function read() {
  try {
    return JSON.parse(fs.readFileSync(getStorePath(), "utf-8"));
  } catch {
    return {};
  }
}
function write(data) {
  fs.mkdirSync(path.dirname(getStorePath()), { recursive: true });
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2), "utf-8");
}
function getToken() {
  return read().token;
}
function setToken(token) {
  write({ ...read(), token });
}
function clearToken() {
  const data = read();
  delete data.token;
  write(data);
}
function getSelectedRepo() {
  return read().selectedRepo;
}
let client = null;
function initClient() {
  const token = getToken();
  client = token ? new GitHubClient(token) : null;
}
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "throughline",
    backgroundColor: "#0E1620",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  initClient();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.handle("get-settings", () => ({
  token: getToken(),
  selectedRepo: getSelectedRepo()
}));
electron.ipcMain.handle("set-token", (_e, token) => {
  setToken(token);
  client = new GitHubClient(token);
});
electron.ipcMain.handle("clear-token", () => {
  clearToken();
  client = null;
});
electron.ipcMain.handle("list-repos", async () => {
  if (!client) throw new Error("No token set");
  return client.listRepos();
});
electron.ipcMain.handle("get-feature-flows", async (_e, repo) => {
  if (!client) throw new Error("No token set");
  return client.getFeatureFlows(repo);
});
electron.ipcMain.handle("open-url", (_e, url) => {
  electron.shell.openExternal(url);
});
