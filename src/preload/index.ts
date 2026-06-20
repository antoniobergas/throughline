import { contextBridge, ipcRenderer } from "electron";
import type { FeatureFlow, AgentProviderInfo, WorkflowRun, AgentProviderId } from "../shared/types";

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: (): Promise<{ hasToken: boolean; login?: string; selectedRepo?: string }> =>
    ipcRenderer.invoke("get-settings"),

  // GitHub OAuth Device Flow
  startGitHubAuth: (): Promise<{ user_code: string; verification_uri: string; expires_in: number }> =>
    ipcRenderer.invoke("github-auth-start"),
  cancelGitHubAuth: (): Promise<void> =>
    ipcRenderer.invoke("github-auth-cancel"),
  onAuthResult: (
    callback: (result: { ok: true; login: string } | { ok: false; error: string }) => void,
  ): (() => void) => {
    const onComplete = (_: Electron.IpcRendererEvent, data: { login: string }) =>
      callback({ ok: true, login: data.login });
    const onError = (_: Electron.IpcRendererEvent, error: string) =>
      callback({ ok: false, error });
    ipcRenderer.on("auth-complete", onComplete);
    ipcRenderer.on("auth-error", onError);
    return () => {
      ipcRenderer.removeListener("auth-complete", onComplete);
      ipcRenderer.removeListener("auth-error", onError);
    };
  },

  clearToken: (): Promise<void> =>
    ipcRenderer.invoke("clear-token"),
  listRepos: (): Promise<string[]> =>
    ipcRenderer.invoke("list-repos"),
  getFeatureFlows: (repo: string): Promise<FeatureFlow[]> =>
    ipcRenderer.invoke("get-feature-flows", repo),
  setSelectedRepo: (repo: string): Promise<void> =>
    ipcRenderer.invoke("set-selected-repo", repo),
  getSelectedRepos: (): Promise<string[]> =>
    ipcRenderer.invoke("get-selected-repos"),
  setSelectedRepos: (repos: string[]): Promise<void> =>
    ipcRenderer.invoke("set-selected-repos", repos),
  reportAttention: (items: Array<{ id: string; reason: string; title: string }>): Promise<void> =>
    ipcRenderer.invoke("report-attention", items),
  openUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke("open-url", url),

  // ── Workflow / agent APIs ───────────────────────────────────────────────────
  getAgentProviders: (): Promise<AgentProviderInfo[]> =>
    ipcRenderer.invoke("get-agent-providers"),
  createWorkflow: (opts: {
    repo: string;
    isLocal: boolean;
    branch: string;
    description: string;
    provider: AgentProviderId;
    subagentCount: number;
  }): Promise<WorkflowRun[]> =>
    ipcRenderer.invoke("create-workflow", opts),
  getWorkflows: (): Promise<WorkflowRun[]> =>
    ipcRenderer.invoke("get-workflows"),
  getWorkflowLogs: (runId: string): Promise<string[]> =>
    ipcRenderer.invoke("get-workflow-logs", runId),
  abortWorkflow: (runId: string): Promise<void> =>
    ipcRenderer.invoke("abort-workflow", runId),
  pickLocalFolder: (): Promise<{ path: string; valid: boolean; remote?: string } | null> =>
    ipcRenderer.invoke("pick-local-folder"),
  slugifyBranch: (text: string): Promise<string> =>
    ipcRenderer.invoke("slugify-branch", text),
  onWorkflowUpdate: (callback: (run: WorkflowRun) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, run: WorkflowRun) => callback(run);
    ipcRenderer.on("workflow-update", handler);
    return () => ipcRenderer.removeListener("workflow-update", handler);
  },
  onWorkflowLog: (runId: string, callback: (line: string) => void): (() => void) => {
    const channel = `workflow-log:${runId}`;
    const handler = (_: Electron.IpcRendererEvent, line: string) => callback(line);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
