import { execFile, spawn } from "child_process";
import { promisify } from "util";
import type { LocalAgentProvider, AgentTask } from "./types";

const execFileAsync = promisify(execFile);

function buildPrompt(task: AgentTask): string {
  const lines = [
    `Implement the following task in this git repository.`,
    `The branch \`${task.branch}\` is already checked out.`,
    ``,
    `Task: ${task.description}`,
    ``,
    `Instructions:`,
    `- Make all necessary code changes to implement the task`,
    `- Write clear commit messages`,
    `- Push the branch to origin`,
    `- Create a pull request on GitHub with a descriptive title and summary`,
    ``,
    `Work autonomously end-to-end. Do not ask for confirmation.`,
  ];
  if (task.githubRepo) {
    lines.push(`GitHub repo: ${task.githubRepo}`);
  }
  return lines.join("\n");
}

export const claudeCodeProvider: LocalAgentProvider = {
  id: "claude-code",
  name: "Claude Code",
  description: "Anthropic's autonomous coding agent",
  kind: "local",

  async checkAvailable(): Promise<boolean> {
    try {
      await execFileAsync("claude", ["--version"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },

  spawn(task: AgentTask) {
    return spawn("claude", ["--dangerously-skip-permissions", "-p", buildPrompt(task)], {
      cwd: task.workdir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
  },
};
