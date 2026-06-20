import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { GitHubClient } from "./github";
import { getToken, setToken, clearToken, getSelectedRepo, setSelectedRepo } from "./store";

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

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle("get-settings", () => ({
  token: getToken(),
  selectedRepo: getSelectedRepo(),
}));

ipcMain.handle("set-token", (_e, token: string) => {
  setToken(token);
  client = new GitHubClient(token);
});

ipcMain.handle("clear-token", () => {
  clearToken();
  client = null;
});

ipcMain.handle("list-repos", async () => {
  if (!client) throw new Error("No token set");
  return client.listRepos();
});

ipcMain.handle("get-feature-flows", async (_e, repo: string) => {
  if (!client) throw new Error("No token set");
  return client.getFeatureFlows(repo);
});

ipcMain.handle("open-url", (_e, url: string) => {
  shell.openExternal(url);
});
