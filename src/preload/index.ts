import { contextBridge, ipcRenderer } from "electron";
import type { FeatureFlow } from "../shared/types";

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: (): Promise<{ token?: string; selectedRepo?: string }> =>
    ipcRenderer.invoke("get-settings"),
  testToken: (token: string): Promise<{ login: string }> =>
    ipcRenderer.invoke("test-token", token),
  setToken: (token: string): Promise<void> =>
    ipcRenderer.invoke("set-token", token),
  clearToken: (): Promise<void> =>
    ipcRenderer.invoke("clear-token"),
  listRepos: (): Promise<string[]> =>
    ipcRenderer.invoke("list-repos"),
  getFeatureFlows: (repo: string): Promise<FeatureFlow[]> =>
    ipcRenderer.invoke("get-feature-flows", repo),
  setSelectedRepo: (repo: string): Promise<void> =>
    ipcRenderer.invoke("set-selected-repo", repo),
  openUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke("open-url", url),
});
