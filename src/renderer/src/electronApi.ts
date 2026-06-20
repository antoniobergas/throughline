import type { FeatureFlow, AgentProviderInfo, WorkflowRun, AgentProviderId } from "../../shared/types";

type AuthResult = { ok: true; login: string } | { ok: false; error: string };

interface ElectronAPI {
  getSettings(): Promise<{ hasToken: boolean; login?: string; selectedRepo?: string }>;
  startGitHubAuth(): Promise<{ user_code: string; verification_uri: string; expires_in: number }>;
  cancelGitHubAuth(): Promise<void>;
  onAuthResult(callback: (result: AuthResult) => void): () => void;
  clearToken(): Promise<void>;
  listRepos(): Promise<string[]>;
  getFeatureFlows(repo: string): Promise<FeatureFlow[]>;
  setSelectedRepo(repo: string): Promise<void>;
  getSelectedRepos(): Promise<string[]>;
  setSelectedRepos(repos: string[]): Promise<void>;
  reportAttention(items: Array<{ id: string; reason: string; title: string }>): Promise<void>;
  openUrl(url: string): Promise<void>;
  // Workflows
  getAgentProviders(): Promise<AgentProviderInfo[]>;
  createWorkflow(opts: {
    repo: string;
    isLocal: boolean;
    branch: string;
    description: string;
    provider: AgentProviderId;
    subagentCount: number;
  }): Promise<WorkflowRun[]>;
  getWorkflows(): Promise<WorkflowRun[]>;
  getWorkflowLogs(runId: string): Promise<string[]>;
  abortWorkflow(runId: string): Promise<void>;
  pickLocalFolder(): Promise<{ path: string; valid: boolean; remote?: string } | null>;
  slugifyBranch(text: string): Promise<string>;
  onWorkflowUpdate(callback: (run: WorkflowRun) => void): () => void;
  onWorkflowLog(runId: string, callback: (line: string) => void): () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const api = (): ElectronAPI => {
  if (!window.electronAPI) throw new Error("Electron API not available");
  return window.electronAPI;
};

export const isElectron = (): boolean => !!window.electronAPI;

export const getSettings = () => api().getSettings();
export const startGitHubAuth = () => api().startGitHubAuth();
export const cancelGitHubAuth = () => api().cancelGitHubAuth();
export const onAuthResult = (cb: (result: AuthResult) => void) => api().onAuthResult(cb);
export const clearToken = () => api().clearToken();
export const listRepos = () => api().listRepos();
export const getFeatureFlows = (repo: string) => api().getFeatureFlows(repo);
export const setSelectedRepo = (repo: string) => api().setSelectedRepo(repo);
export const getSelectedRepos = () => api().getSelectedRepos();
export const setSelectedRepos = (repos: string[]) => api().setSelectedRepos(repos);
export const reportAttention = (items: Array<{ id: string; reason: string; title: string }>) => {
  if (window.electronAPI) api().reportAttention(items);
};
export const openUrl = (url: string) => {
  if (window.electronAPI) {
    window.electronAPI.openUrl(url);
  } else {
    window.open(url, "_blank", "noopener");
  }
};
export const getAgentProviders = () => api().getAgentProviders();
export const createWorkflow = (opts: Parameters<ElectronAPI["createWorkflow"]>[0]) => api().createWorkflow(opts);
export const getWorkflows = () => api().getWorkflows();
export const getWorkflowLogs = (runId: string) => api().getWorkflowLogs(runId);
export const abortWorkflow = (runId: string) => api().abortWorkflow(runId);
export const pickLocalFolder = () => api().pickLocalFolder();
export const slugifyBranch = (text: string) => api().slugifyBranch(text);
export const onWorkflowUpdate = (cb: (run: WorkflowRun) => void) => api().onWorkflowUpdate(cb);
export const onWorkflowLog = (runId: string, cb: (line: string) => void) => api().onWorkflowLog(runId, cb);
