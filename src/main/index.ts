import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { GitHubClient } from "./github";
import { GITHUB_OAUTH_CLIENT_ID, requestDeviceCode, pollForToken } from "./auth";
import { getToken, setToken, clearToken, getSelectedRepo, setSelectedRepo, getSelectedRepos, setSelectedRepos } from "./store";
import type { FeatureFlow } from "../shared/types";

let client: GitHubClient | null = null;
let authAbortController: AbortController | null = null;

const knownAttentionIds = new Set<string>();
let isFirstLoad = true;

function initClient(): void {
  const token = getToken();
  client = token ? new GitHubClient(token) : null;
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "throughline",
    backgroundColor: "#080E14",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  initClient();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── Error classification ───────────────────────────────────────────────────────

function classifyGitHubError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const status = typeof e["status"] === "number" ? e["status"] : undefined;

    if (status === 401) return "AUTH_401";

    if (status === 403 || status === 429) {
      const headers = e["response"] && typeof e["response"] === "object"
        ? (e["response"] as Record<string, unknown>)["headers"]
        : undefined;
      const reset = headers && typeof headers === "object"
        ? (headers as Record<string, unknown>)["x-ratelimit-reset"]
        : undefined;
      const resetEpoch = reset !== undefined ? String(reset) : "";
      if (resetEpoch) return `RATE_LIMIT:${resetEpoch}`;
      return "RATE_LIMIT:";
    }

    if (status === 404) return "NOT_FOUND_404";

    const code = typeof e["code"] === "string" ? e["code"] : "";
    if (!status && (code.startsWith("ECON") || code === "ETIMEDOUT" || code === "ENOTFOUND")) {
      return "NETWORK";
    }
  }

  const msg = err instanceof Error ? err.message : String(err);
  return `UNKNOWN:${msg}`;
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle("get-settings", async (): Promise<{ hasToken: boolean; login?: string; selectedRepo?: string }> => {
  const token = getToken();
  let login: string | undefined;
  if (token && client) {
    login = await client.getAuthenticatedUser().catch(() => undefined);
  }
  return { hasToken: !!token, login, selectedRepo: getSelectedRepo() };
});

// GitHub OAuth Device Flow
ipcMain.handle("github-auth-start", async (): Promise<{ user_code: string; verification_uri: string; expires_in: number }> => {
  const clientId = GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("NO_CLIENT_ID");
  }

  // Cancel any in-progress auth
  if (authAbortController) authAbortController.abort();
  authAbortController = new AbortController();
  const { signal } = authAbortController;

  const deviceData = await requestDeviceCode(clientId);
  shell.openExternal(deviceData.verification_uri_complete || deviceData.verification_uri);

  // Poll in background; send result via webContents event
  const win = BrowserWindow.getAllWindows()[0];
  pollForToken(clientId, deviceData.device_code, deviceData.interval, signal)
    .then(async (token) => {
      setToken(token);
      client = new GitHubClient(token);
      const login = await client.getAuthenticatedUser().catch(() => "");
      win?.webContents.send("auth-complete", { login });
    })
    .catch((err: Error) => {
      if (err.message !== "CANCELLED") {
        win?.webContents.send("auth-error", err.message);
      }
    });

  return {
    user_code: deviceData.user_code,
    verification_uri: deviceData.verification_uri,
    expires_in: deviceData.expires_in,
  };
});

ipcMain.handle("github-auth-cancel", (): void => {
  if (authAbortController) {
    authAbortController.abort();
    authAbortController = null;
  }
});

ipcMain.handle("clear-token", (): void => {
  clearToken();
  client = null;
});

ipcMain.handle("list-repos", async (): Promise<string[]> => {
  if (!client) throw new Error("No token set");
  try {
    return await client.listRepos();
  } catch (err) {
    throw new Error(classifyGitHubError(err));
  }
});

ipcMain.handle("get-feature-flows", async (_e, repo: string): Promise<FeatureFlow[]> => {
  if (!client) throw new Error("No token set");
  try {
    return await client.getFeatureFlows(repo);
  } catch (err) {
    throw new Error(classifyGitHubError(err));
  }
});

ipcMain.handle("set-selected-repo", (_e, repo: string): void => {
  setSelectedRepo(repo);
});

ipcMain.handle("get-selected-repos", (): string[] => {
  return getSelectedRepos();
});

ipcMain.handle("set-selected-repos", (_e, repos: string[]): void => {
  setSelectedRepos(repos);
});

ipcMain.handle("report-attention", (_e, items: Array<{ id: string; reason: string; title: string }>): void => {
  if (isFirstLoad) {
    isFirstLoad = false;
    for (const item of items) knownAttentionIds.add(item.id);
    return;
  }
  const currentIds = new Set(items.map((i) => i.id));
  for (const item of items) {
    if (!knownAttentionIds.has(item.id)) {
      const { Notification } = require("electron") as typeof import("electron");
      const n = new Notification({
        title: "throughline — needs attention",
        body: `${item.title}: ${item.reason.replace(/_/g, " ")}`,
      });
      n.show();
    }
  }
  knownAttentionIds.clear();
  for (const id of currentIds) knownAttentionIds.add(id);
});

ipcMain.handle("open-url", (_e, url: string): void => {
  shell.openExternal(url);
});
