import https from "https";
import type { RemoteAgentProvider, AgentTask } from "./types";

function ghPost<T>(path: string, body: unknown, token: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: "api.github.com",
      path,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "throughline/0.1",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c: string) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data) as T); }
        catch { reject(new Error(`Non-JSON: ${data.slice(0, 200)}`)); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

interface IssueResponse { number: number; html_url: string; }
interface AssignResponse { assignees: Array<{ login: string }> }

export const copilotProvider: RemoteAgentProvider = {
  id: "copilot",
  name: "GitHub Copilot",
  description: "GitHub Copilot coding agent (requires Copilot in repo)",
  kind: "remote",

  async checkAvailable(token: string): Promise<boolean> {
    // We can't check Copilot availability without a specific repo; optimistically true if token exists
    return !!token;
  },

  async trigger(task: AgentTask & { token: string }): Promise<{ trackingUrl: string }> {
    if (!task.githubRepo) throw new Error("GitHub repo required for Copilot provider");
    const [owner, repo] = task.githubRepo.split("/");

    // Create an issue for Copilot to work on
    const issue = await ghPost<IssueResponse>(
      `/repos/${owner}/${repo}/issues`,
      {
        title: task.description.slice(0, 120),
        body: [
          `**Task:** ${task.description}`,
          ``,
          `**Branch:** \`${task.branch}\``,
          ``,
          `_Created by throughline — please implement this task, commit to the branch above, and open a PR._`,
        ].join("\n"),
        labels: ["copilot"],
      },
      task.token,
    );

    // Assign @copilot to trigger the coding agent
    await ghPost<AssignResponse>(
      `/repos/${owner}/${repo}/issues/${issue.number}/assignees`,
      { assignees: ["copilot"] },
      task.token,
    ).catch(() => {
      // Copilot assignee may not be available; issue is still created
    });

    return { trackingUrl: issue.html_url };
  },
};
