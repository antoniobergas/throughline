export type StageId = "work" | "pr" | "checks" | "review" | "merge" | "deploy" | "prod";
export type StageState = "pending" | "active" | "done" | "failed" | "no_data";
export type SatelliteKind = "agent" | "subagent" | "ai_review" | "environment";
export type SatelliteStatus = "running" | "passed" | "failed" | "waiting";
export type AttentionReason =
  | "check_failed"
  | "review_requested"
  | "changes_requested"
  | "deploy_waiting_approval"
  | "deploy_failed"
  | "merge_conflict";

export interface Satellite {
  id: string;
  kind: SatelliteKind;
  label: string;
  focus?: string;
  status: SatelliteStatus;
  parentId?: string;
  url?: string;
}

export interface Stage {
  id: StageId;
  state: StageState;
  summary?: string;
  satellites: Satellite[];
  url?: string;
  logUrl?: string;
}

export interface Attention {
  reason: AttentionReason;
  stage: StageId;
  url: string;
}

export interface FeatureFlow {
  id: string;
  title: string;
  branch: string;
  headSha?: string;
  mergeCommitSha?: string;
  repo: string;
  stages: Stage[];
  needsAttention: Attention[];
  updatedAt: string;
}

export interface AppSettings {
  token?: string;
  selectedRepo?: string;
  selectedRepos?: string[];
}

// ── Workflows ─────────────────────────────────────────────────────────────────

export type AgentProviderId = "claude-code" | "aider" | "copilot";

export interface AgentProviderInfo {
  id: AgentProviderId;
  name: string;
  description: string;
  kind: "local" | "remote";
  available: boolean;
}

export type WorkflowStatus = "cloning" | "running" | "done" | "failed" | "aborted";

export interface WorkflowRun {
  id: string;
  /** "owner/repo" for GitHub repos, absolute path for local */
  repo: string;
  /** Short display name */
  repoDisplay: string;
  isLocal: boolean;
  branch: string;
  description: string;
  provider: AgentProviderId;
  status: WorkflowStatus;
  prUrl?: string;
  prNumber?: number;
  startedAt: number;
  endedAt?: number;
  /** 1-based index when running as a subagent in a parallel set */
  subagentIndex?: number;
  /** parent workflow id for subagents */
  parentId?: string;
  exitCode?: number;
}
