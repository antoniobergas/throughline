import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { GitHubClient } from "./github";
import { getToken, setToken, clearToken, getSelectedRepo, setSelectedRepo } from "./store";
import type { AppSettings, FeatureFlow } from "../shared/types";

let client: GitHubClient | null = null;

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
    backgroundColor: "#0E1620",
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

/**
 * Classify a GitHub API error into a structured error code that the renderer
 * can turn into an actionable message.  Codes:
 *   AUTH_401                 – invalid / expired token
 *   RATE_LIMIT:<epoch>       – primary rate limit; epoch = x-ratelimit-reset
 *   SCOPE_403                – 403 that is NOT a rate-limit (missing scopes)
 *   NOT_FOUND_404            – repo not found or token lacks access
 *   NETWORK                  – connection-level failure (no status code)
 *   UNKNOWN:<original>       – anything else
 */
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

ipcMain.handle("get-settings", (): AppSettings => ({
  token: getToken(),
  selectedRepo: getSelectedRepo(),
}));

ipcMain.handle("test-token", async (_e, token: string): Promise<{ login: string }> => {
  const tempClient = new GitHubClient(token);
  try {
    const login = await tempClient.getAuthenticatedUser();
    return { login };
  } catch (err) {
    throw new Error(classifyGitHubError(err));
  }
});

ipcMain.handle("set-token", (_e, token: string): void => {
  setToken(token);
  client = new GitHubClient(token);
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

ipcMain.handle("open-url", (_e, url: string): void => {
  shell.openExternal(url);
});
