import type { FeatureFlow } from "../../shared/types";

interface ElectronAPI {
  getSettings(): Promise<{ token?: string; selectedRepo?: string }>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
  listRepos(): Promise<string[]>;
  getFeatureFlows(repo: string): Promise<FeatureFlow[]>;
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
export const setToken = (token: string) => api().setToken(token);
export const clearToken = () => api().clearToken();
export const listRepos = () => api().listRepos();
export const getFeatureFlows = (repo: string) => api().getFeatureFlows(repo);
export const openUrl = (url: string) => {
  if (window.electronAPI) {
    window.electronAPI.openUrl(url);
  } else {
    window.open(url, "_blank", "noopener");
  }
};
