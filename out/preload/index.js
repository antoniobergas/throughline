"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  setToken: (token) => electron.ipcRenderer.invoke("set-token", token),
  clearToken: () => electron.ipcRenderer.invoke("clear-token"),
  listRepos: () => electron.ipcRenderer.invoke("list-repos"),
  getFeatureFlows: (repo) => electron.ipcRenderer.invoke("get-feature-flows", repo),
  openUrl: (url) => electron.ipcRenderer.invoke("open-url", url)
});
