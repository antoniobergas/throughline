import { exec, execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";
import type { ChildProcess } from "child_process";
import type { BrowserWindow } from "electron";
import type { WorkflowRun, AgentProviderId } from "../shared/types";
import { getProvider } from "./agents/registry";
import type { LocalAgentProvider } from "./agents/types";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

let win: BrowserWindow | null = null;
export function setWorkflowWindow(w: BrowserWindow) { win = w; }

// ── State ────────────────────────────────────────────────────────────────────

interface RunState {
  run: WorkflowRun;
  logs: string[];
  process?: ChildProcess;
  trackingUrl?: string; // for remote providers
}

const runs = new Map<string, RunState>();

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function push(runId: string, line: string) {
  const state = runs.get(runId);
  if (!state) return;
  state.logs.push(line);
  win?.webContents.send(`workflow-log:${runId}`, line);
}

function updateStatus(runId: string, patch: Partial<WorkflowRun>) {
  const state = runs.get(runId);
  if (!state) return;
  Object.assign(state.run, patch);
  win?.webContents.send("workflow-update", state.run);
}

// ── Git helpers ───────────────────────────────────────────────────────────────

async function gitCheckout(workdir: string, branch: string): Promise<void> {
  await execAsync(`git checkout -b "${branch}"`, { cwd: workdir });
}

async function cloneRepo(githubRepo: string, token: string, destDir: string, logFn: (l: string) => void): Promise<void> {
  fs.mkdirSync(destDir, { recursive: true });
  const cloneUrl = `https://x-access-token:${token}@github.com/${githubRepo}.git`;
  logFn(`Cloning ${githubRepo}…`);
  await new Promise<void>((resolve, reject) => {
    const proc = exec(`git clone --depth 1 "${cloneUrl}" .`, { cwd: destDir });
    proc.stdout?.on("data", (d: string) => logFn(d.trim()));
    proc.stderr?.on("data", (d: string) => logFn(d.trim()));
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`git clone exited ${code}`)));
  });
}

async function getGitRemote(workdir: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync("git remote get-url origin", { cwd: workdir });
    const match = stdout.trim().match(/github\.com[:/](.+?)(?:\.git)?$/);
    return match?.[1]; // "owner/repo"
  } catch {
    return undefined;
  }
}

// ── PR URL detection from stdout ──────────────────────────────────────────────

const PR_URL_RE = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/g;

function extractPrUrl(line: string): string | undefined {
  const matches = line.match(PR_URL_RE);
  return matches?.[0];
}

// ── Create workflow ───────────────────────────────────────────────────────────

export interface CreateWorkflowOpts {
  repo: string;       // "owner/repo" or absolute local path
  isLocal: boolean;
  branch: string;
  description: string;
  provider: AgentProviderId;
  subagentCount: number;
  token?: string;
}

export async function createWorkflows(opts: CreateWorkflowOpts): Promise<WorkflowRun[]> {
  const count = Math.max(1, Math.min(4, opts.subagentCount));
  const results: WorkflowRun[] = [];

  if (count === 1) {
    const run = await spawnSingle({ ...opts, branch: opts.branch });
    results.push(run);
  } else {
    for (let i = 1; i <= count; i++) {
      const branch = `${opts.branch}/agent-${i}`;
      const run = await spawnSingle({ ...opts, branch, subagentIndex: i });
      results.push(run);
    }
  }

  return results;
}

async function spawnSingle(
  opts: CreateWorkflowOpts & { subagentIndex?: number; parentId?: string },
): Promise<WorkflowRun> {
  const runId = uid();
  const repoDisplay = opts.isLocal ? path.basename(opts.repo) : opts.repo;

  const run: WorkflowRun = {
    id: runId,
    repo: opts.repo,
    repoDisplay,
    isLocal: opts.isLocal,
    branch: opts.branch,
    description: opts.description,
    provider: opts.provider,
    status: "cloning",
    startedAt: Date.now(),
    subagentIndex: opts.subagentIndex,
    parentId: opts.parentId,
  };

  const state: RunState = { run, logs: [] };
  runs.set(runId, state);
  win?.webContents.send("workflow-update", run);

  // Run asynchronously
  executeWorkflow(runId, opts).catch(() => {});

  return run;
}

async function executeWorkflow(runId: string, opts: CreateWorkflowOpts & { subagentIndex?: number }): Promise<void> {
  const logFn = (line: string) => push(runId, line);

  try {
    let workdir: string;
    let githubRepo: string | undefined;

    if (opts.isLocal) {
      workdir = opts.repo;
      githubRepo = await getGitRemote(workdir);
    } else {
      // Clone GitHub repo to temp dir
      const tmpBase = path.join(os.tmpdir(), "throughline", opts.repo.replace("/", "_"));
      workdir = path.join(tmpBase, opts.branch.replace(/\//g, "_"));
      if (!opts.token) throw new Error("GitHub token required for remote repos");
      await cloneRepo(opts.repo, opts.token, workdir, logFn);
      githubRepo = opts.repo;
    }

    // Create branch
    logFn(`Creating branch: ${opts.branch}`);
    await gitCheckout(workdir, opts.branch);
    updateStatus(runId, { status: "running" });

    const provider = getProvider(opts.provider);
    if (!provider) throw new Error(`Unknown provider: ${opts.provider}`);

    if (provider.kind === "remote") {
      if (!opts.token) throw new Error("Token required for remote provider");
      logFn(`Triggering ${provider.name} agent…`);
      const result = await provider.trigger({
        workdir,
        branch: opts.branch,
        description: opts.description,
        githubRepo,
        token: opts.token,
      });
      logFn(`Tracking: ${result.trackingUrl}`);
      updateStatus(runId, { status: "done", prUrl: result.trackingUrl });
      return;
    }

    // Local provider — spawn child process
    logFn(`Spawning ${provider.name}…`);
    const localProvider = provider as LocalAgentProvider;
    const child = localProvider.spawn({ workdir, branch: opts.branch, description: opts.description, githubRepo, token: opts.token });
    const state = runs.get(runId);
    if (state) state.process = child;

    let prUrl: string | undefined;

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (data: string) => {
      for (const line of data.split("\n").filter(Boolean)) {
        logFn(line);
        const found = extractPrUrl(line);
        if (found && !prUrl) {
          prUrl = found;
          const num = parseInt(prUrl.split("/").pop() ?? "", 10) || undefined;
          updateStatus(runId, { prUrl, prNumber: num });
        }
      }
    });

    child.stderr?.on("data", (data: string) => {
      for (const line of data.split("\n").filter(Boolean)) {
        logFn(`[stderr] ${line}`);
      }
    });

    const exitCode = await new Promise<number>((resolve) => {
      child.on("close", (code) => resolve(code ?? 0));
    });

    const status: WorkflowRun["status"] = exitCode === 0 ? "done" : "failed";
    updateStatus(runId, { status, exitCode, endedAt: Date.now() });
    logFn(`\n─── Agent finished (exit ${exitCode}) ───`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    push(runId, `\n[ERROR] ${msg}`);
    updateStatus(runId, { status: "failed", endedAt: Date.now() });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getWorkflows(): WorkflowRun[] {
  return [...runs.values()].map((s) => s.run).sort((a, b) => b.startedAt - a.startedAt);
}

export function getWorkflowLogs(runId: string): string[] {
  return runs.get(runId)?.logs ?? [];
}

export function abortWorkflow(runId: string): void {
  const state = runs.get(runId);
  if (!state) return;
  state.process?.kill("SIGTERM");
  updateStatus(runId, { status: "aborted", endedAt: Date.now() });
}

export async function getLocalRepoInfo(folderPath: string): Promise<{ valid: boolean; remote?: string }> {
  try {
    await execFileAsync("git", ["-C", folderPath, "status"], { timeout: 5000 });
    const remote = await getGitRemote(folderPath).catch(() => undefined);
    return { valid: true, remote };
  } catch {
    return { valid: false };
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}
