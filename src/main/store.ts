import fs from "fs";
import path from "path";
import { app } from "electron";

interface StoreData {
  token?: string;
  selectedRepo?: string;
}

function getStorePath(): string {
  return path.join(app.getPath("userData"), "throughline-settings.json");
}

function read(): StoreData {
  try {
    return JSON.parse(fs.readFileSync(getStorePath(), "utf-8")) as StoreData;
  } catch {
    return {};
  }
}

function write(data: StoreData): void {
  fs.mkdirSync(path.dirname(getStorePath()), { recursive: true });
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2), "utf-8");
}

export function getToken(): string | undefined {
  return read().token;
}

export function setToken(token: string): void {
  write({ ...read(), token });
}

export function clearToken(): void {
  const data = read();
  delete data.token;
  write(data);
}

export function getSelectedRepo(): string | undefined {
  return read().selectedRepo;
}

export function setSelectedRepo(repo: string): void {
  write({ ...read(), selectedRepo: repo });
}
