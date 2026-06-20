import { Octokit } from "@octokit/rest";
import type {
  FeatureFlow, Stage, StageId, StageState,
  Satellite, SatelliteStatus, Attention,
} from "../shared/types";

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getAuthenticatedUser(): Promise<string> {
    const { data } = await this.octokit.users.getAuthenticated();
    return data.login;
  }

  async listRepos(): Promise<string[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "pushed",
    });
    return data.map((r) => r.full_name);
  }

  async getFeatureFlows(repo: string): Promise<FeatureFlow[]> {
    const [owner, repoName] = repo.split("/");
    const me = await this.getAuthenticatedUser().catch(() => "");

    const [openPRs, closedPRs] = await Promise.all([
      this.octokit.pulls.list({ owner, repo: repoName, state: "open", per_page: 30, sort: "updated", direction: "desc" }),
      this.octokit.pulls.list({ owner, repo: repoName, state: "closed", per_page: 5, sort: "updated", direction: "desc" }),
    ]);

    const prs = [...openPRs.data, ...closedPRs.data.filter((p) => p.merged_at)];
    const flows = await Promise.all(prs.map((pr) => this.prToFlow(pr, owner, repoName, me)));
    return flows.filter((f): f is FeatureFlow => f !== null);
  }

  private async prToFlow(
    pr: Awaited<ReturnType<Octokit["pulls"]["list"]>>["data"][number],
    owner: string,
    repo: string,
    me: string,
  ): Promise<FeatureFlow | null> {
    try {
      const needsAttention: Attention[] = [];
      const prUrl = pr.html_url;
      const headSha = pr.head.sha;
      const mergeCommitSha = pr.merge_commit_sha ?? undefined;
      const isBot = (pr.user?.login.toLowerCase().includes("copilot") ?? false) || pr.user?.type === "Bot";

      const workStage: Stage = {
        id: "work", state: "done", summary: "authored", url: prUrl,
        satellites: [{
          id: `agent-${pr.number}`,
          kind: "agent",
          label: isBot ? "Copilot Agent" : (pr.user?.login ?? "author"),
          status: "passed",
          url: prUrl,
        }],
      };

      const prStage: Stage = {
        id: "pr", state: "done", summary: `#${pr.number}`, url: prUrl, satellites: [],
      };

      const checksStage = await this.buildChecksStage(owner, repo, headSha, prUrl, needsAttention);

      // Requested reviewers may be null in the Octokit type for closed PRs
      const requestedReviewers = (pr.requested_reviewers ?? []).filter(Boolean) as { login: string }[];
      const reviewStage = await this.buildReviewStage(owner, repo, pr.number, requestedReviewers, prUrl, me, needsAttention);

      const mergeableState = (pr as unknown as { mergeable_state?: string }).mergeable_state ?? "";
      if (mergeableState === "dirty" || mergeableState === "conflicting") {
        needsAttention.push({ reason: "merge_conflict", stage: "merge", url: prUrl });
      }
      const isFullyMerged = !!pr.merged_at;
      const mergeStage: Stage = {
        id: "merge",
        state: isFullyMerged ? "done" : mergeableState === "clean" ? "active" : "pending",
        summary: isFullyMerged ? "merged" : mergeableState === "clean" ? "ready" : mergeableState === "dirty" ? "conflict" : undefined,
        url: prUrl,
        satellites: [],
      };

      const [deployStage, prodStage] = mergeCommitSha
        ? await this.buildDeployStages(owner, repo, mergeCommitSha, needsAttention)
        : [noData("deploy"), noData("prod")];

      return {
        id: `${owner}-${repo}-${pr.number}`,
        title: pr.title,
        branch: pr.head.ref,
        headSha,
        mergeCommitSha,
        repo: `${owner}/${repo}`,
        stages: [workStage, prStage, checksStage, reviewStage, mergeStage, deployStage, prodStage],
        needsAttention,
        updatedAt: pr.updated_at,
      };
    } catch {
      return null;
    }
  }

  private async buildChecksStage(
    owner: string, repo: string, sha: string, prUrl: string, needsAttention: Attention[],
  ): Promise<Stage> {
    try {
      const { data } = await this.octokit.checks.listForRef({ owner, repo, ref: sha, per_page: 100 });
      const runs = data.check_runs;
      if (!runs.length) return noData("checks");

      let passed = 0;
      let failedUrl: string | undefined;
      let anyInProgress = false;

      for (const run of runs) {
        if (run.conclusion === "success" || run.conclusion === "skipped" || run.conclusion === "neutral") {
          passed++;
        } else if (run.conclusion === "failure" || run.conclusion === "timed_out" || run.conclusion === "cancelled") {
          failedUrl ??= run.details_url ?? run.html_url ?? undefined;
        }
        if (run.status === "in_progress" || run.status === "queued") anyInProgress = true;
      }

      const state: StageState = failedUrl ? "failed" : anyInProgress ? "active" : passed === runs.length ? "done" : "pending";
      if (failedUrl) needsAttention.push({ reason: "check_failed", stage: "checks", url: failedUrl });

      return {
        id: "checks", state, summary: `${passed}/${runs.length}`,
        url: `https://github.com/${owner}/${repo}/actions`,
        logUrl: failedUrl,
        satellites: [],
      };
    } catch {
      return noData("checks");
    }
  }

  private async buildReviewStage(
    owner: string,
    repo: string,
    prNumber: number,
    requested: { login: string }[],
    prUrl: string,
    me: string,
    needsAttention: Attention[],
  ): Promise<Stage> {
    try {
      const iAmRequested = requested.some((r) => r.login === me);
      if (iAmRequested) needsAttention.push({ reason: "review_requested", stage: "review", url: `${prUrl}/files` });

      const { data: reviews } = await this.octokit.pulls.listReviews({ owner, repo, pull_number: prNumber });
      const satellites: Satellite[] = [];
      let anyApproved = false;
      let anyChangesRequested = false;

      const perUser = new Map<string, typeof reviews[number]>();
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
        state: anyChangesRequested ? "failed" : anyApproved ? "done" : (iAmRequested || requested.length > 0) ? "active" : "pending",
        summary: anyChangesRequested ? "changes" : anyApproved ? "approved" : iAmRequested ? "you" : requested.length ? "pending" : undefined,
        url: prUrl,
        satellites,
      };
    } catch {
      return { id: "review", state: "pending", url: prUrl, satellites: [] };
    }
  }

  private async buildDeployStages(
    owner: string, repo: string, sha: string, needsAttention: Attention[],
  ): Promise<[Stage, Stage]> {
    try {
      const { data: deployments } = await this.octokit.repos.listDeployments({ owner, repo, sha, per_page: 30 });
      if (!deployments.length) return [noData("deploy"), noData("prod")];

      const nonProdSats: Satellite[] = [];
      const prodSats: Satellite[] = [];
      let deployState: StageState = "no_data";
      let prodState: StageState = "no_data";
      let deploySummary: string | undefined;
      let prodSummary: string | undefined;
      let deployLogUrl: string | undefined;
      let prodLogUrl: string | undefined;

      for (const dep of deployments) {
        const env = dep.environment;
        const isProd = env.toLowerCase().includes("prod");

        const { data: statuses } = await this.octokit.repos.listDeploymentStatuses({
          owner, repo, deployment_id: dep.id, per_page: 1,
        });
        const latest = statuses[0];
        // Use string cast because "waiting" is a valid API state but missing from some Octokit typedefs
        const statusState = (latest?.state as string | undefined) ?? "pending";
        const logUrl = (latest?.log_url as string | undefined) ?? (latest?.target_url as string | undefined) ?? undefined;

        let satStatus: SatelliteStatus;
        let stageState: StageState;
        let summary: string;

        switch (statusState) {
          case "success":     satStatus = "passed";  stageState = "done";   summary = "success";  break;
          case "failure":
          case "error":       satStatus = "failed";  stageState = "failed"; summary = "failed";
            needsAttention.push({ reason: "deploy_failed", stage: isProd ? "prod" : "deploy", url: logUrl ?? dep.url });
            break;
          case "in_progress": satStatus = "running"; stageState = "active"; summary = "deploying"; break;
          case "waiting":     satStatus = "waiting"; stageState = "active"; summary = "waiting";
            needsAttention.push({ reason: "deploy_waiting_approval", stage: isProd ? "prod" : "deploy", url: dep.url });
            break;
          default:            satStatus = "waiting"; stageState = "active"; summary = statusState;
        }

        const sat: Satellite = { id: `env-${env}-${dep.id}`, kind: "environment", label: env, status: satStatus, url: dep.url };

        if (isProd) { prodState = stageState; prodSummary = summary; prodLogUrl = logUrl; prodSats.push(sat); }
        else { deployState = stageState; deploySummary = summary; deployLogUrl = logUrl; nonProdSats.push(sat); }
      }

      return [
        { id: "deploy", state: deployState, summary: deploySummary, satellites: nonProdSats, logUrl: deployLogUrl },
        { id: "prod",   state: prodState,   summary: prodSummary,   satellites: prodSats,    logUrl: prodLogUrl },
      ];
    } catch {
      return [noData("deploy"), noData("prod")];
    }
  }
}

function noData(id: StageId): Stage {
  return { id, state: "no_data", satellites: [] };
}
