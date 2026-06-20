import type { ChildProcess } from "child_process";

export type AgentProviderId = "claude-code" | "aider" | "copilot";

export interface AgentTask {
  workdir: string;
  branch: string;
  description: string;
  githubRepo?: string; // "owner/repo"
  token?: string;
}

export interface LocalAgentProvider {
  id: AgentProviderId;
  name: string;
  description: string;
  kind: "local";
  checkAvailable(): Promise<boolean>;
  spawn(task: AgentTask): ChildProcess;
}

export interface RemoteAgentProvider {
  id: AgentProviderId;
  name: string;
  description: string;
  kind: "remote";
  checkAvailable(token: string): Promise<boolean>;
  trigger(task: AgentTask & { token: string }): Promise<{ trackingUrl: string }>;
}

export type AgentProvider = LocalAgentProvider | RemoteAgentProvider;
