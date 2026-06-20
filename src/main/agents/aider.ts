import { execFile, spawn } from "child_process";
import { promisify } from "util";
import type { LocalAgentProvider, AgentTask } from "./types";

const execFileAsync = promisify(execFile);

export const aiderProvider: LocalAgentProvider = {
  id: "aider",
  name: "Aider",
  description: "AI pair programming in your terminal",
  kind: "local",

  async checkAvailable(): Promise<boolean> {
    try {
      await execFileAsync("aider", ["--version"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },

  spawn(task: AgentTask) {
    return spawn(
      "aider",
      [
        "--yes-always",
        "--no-check-update",
        "--message",
        task.description,
      ],
      {
        cwd: task.workdir,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  },
};
