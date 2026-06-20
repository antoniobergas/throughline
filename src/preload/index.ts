import { contextBridge, ipcRenderer } from "electron";
import type { FeatureFlow } from "../shared/types";

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
});
