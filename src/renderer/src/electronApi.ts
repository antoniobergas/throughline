import type { FeatureFlow } from "../../shared/types";

interface ElectronAPI {
  getSettings(): Promise<{ token?: string; selectedRepo?: string }>;
  testToken(token: string): Promise<{ login: string }>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
  listRepos(): Promise<string[]>;
  getFeatureFlows(repo: string): Promise<FeatureFlow[]>;
  setSelectedRepo(repo: string): Promise<void>;
  getSelectedRepos(): Promise<string[]>;
  setSelectedRepos(repos: string[]): Promise<void>;
  reportAttention(items: Array<{ id: string; reason: string; title: string }>): Promise<void>;
  openUrl(url: string): Promise<void>;
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
export const testToken = (token: string) => api().testToken(token);
export const setToken = (token: string) => api().setToken(token);
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
