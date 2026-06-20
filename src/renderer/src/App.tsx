import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureFlow, WorkflowRun } from "../../shared/types";
import { MOCK_FLOWS } from "./mockData";
import { getSettings, clearToken, listRepos, getFeatureFlows, getSelectedRepos, setSelectedRepos, reportAttention, isElectron, getWorkflows, onWorkflowUpdate } from "./electronApi";
import BoardHeader from "./components/BoardHeader";
import StageHeaderRow from "./components/StageHeaderRow";
import FlowRow from "./components/FlowRow";
import SettingsModal from "./components/SettingsModal";
import Legend from "./components/Legend";
import NewWorkflowModal from "./components/NewWorkflowModal";
import WorkflowRunCard from "./components/WorkflowRunCard";
import LogDrawer from "./components/LogDrawer";

const POLL_INTERVAL = 15_000;
const MAX_CONSECUTIVE_FAILURES = 3;

// ── Error classification ───────────────────────────────────────────────────────

type ErrorCode =
  | "AUTH_401"
  | "RATE_LIMIT"
  | "SCOPE_403"
  | "NOT_FOUND_404"
  | "NETWORK"
  | "UNKNOWN";

interface ParsedError {
  code: ErrorCode;
  rateLimitReset?: number;
  raw?: string;
}

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}

function parseErrorMessage(msg: string): ParsedError {
  if (msg.includes("AUTH_401")) return { code: "AUTH_401" };
  if (msg.includes("RATE_LIMIT")) {
    const parts = msg.split("RATE_LIMIT:");
    const epoch = parts[1] ? parseInt(parts[1], 10) : 0;
    return { code: "RATE_LIMIT", rateLimitReset: isNaN(epoch) ? 0 : epoch };
  }
  if (msg.includes("SCOPE_403")) return { code: "SCOPE_403" };
  if (msg.includes("NOT_FOUND_404")) return { code: "NOT_FOUND_404" };
  if (msg.includes("NETWORK")) return { code: "NETWORK" };
  return { code: "UNKNOWN", raw: msg };
}

function formatResetTime(epoch: number): string {
  if (!epoch) return "soon";
  const d = new Date(epoch * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildErrorCode(parsed: ParsedError): string {
  switch (parsed.code) {
    case "AUTH_401":      return "AUTH_401";
    case "RATE_LIMIT":    return `RATE_LIMIT:${parsed.rateLimitReset ?? 0}:`;
    case "SCOPE_403":     return "SCOPE_403";
    case "NOT_FOUND_404": return "NOT_FOUND_404";
    case "NETWORK":       return "NETWORK";
    default:              return parsed.raw ?? "An unexpected error occurred.";
  }
}

const ATTENTION_REASON_LABELS: Record<string, string> = {
  check_failed: "checks failed",
  review_requested: "review requested",
  changes_requested: "changes requested",
  deploy_waiting_approval: "deploy approval needed",
  deploy_failed: "deploy failed",
  merge_conflict: "merge conflict",
};

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [userLogin, setUserLogin] = useState<string | undefined>(undefined);
  const [selectedRepos, setSelectedRepos_state] = useState<string[]>([]);
  const [repos, setRepos] = useState<string[]>([]);
  const [flows, setFlows] = useState<FeatureFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [activeLogRun, setActiveLogRun] = useState<WorkflowRun | null>(null);
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadGenRef = useRef<number>(0);
  const prevAttentionIdsRef = useRef<Set<string>>(new Set());
  const isFirstPollRef = useRef(true);

  const inElectron = isElectron();

  // Load settings on mount
  useEffect(() => {
    if (!inElectron) {
      setUseMock(true);
      setFlows(MOCK_FLOWS);
      return;
    }
    getSettings()
      .then(async (s) => {
        setHasToken(s.hasToken);
        if (s.login) setUserLogin(s.login);
        const saved = await getSelectedRepos().catch(() => []);
        if (saved.length > 0) {
          setSelectedRepos_state(saved);
        } else if (s.selectedRepo) {
          setSelectedRepos_state([s.selectedRepo]);
        }
      })
      .catch(() => {
        setUseMock(true);
        setFlows(MOCK_FLOWS);
      });
  }, [inElectron]);

  // Load existing workflow runs + subscribe to live updates
  useEffect(() => {
    if (!inElectron) return;
    getWorkflows().then(setWorkflowRuns).catch(() => {});
    const unsub = onWorkflowUpdate((run) => {
      setWorkflowRuns((prev) => {
        const idx = prev.findIndex((r) => r.id === run.id);
        if (idx === -1) return [run, ...prev];
        const next = [...prev];
        next[idx] = run;
        return next;
      });
      // Also update the active log run if it matches
      setActiveLogRun((prev) => prev?.id === run.id ? run : prev);
    });
    return unsub;
  }, [inElectron]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const loadRepos = useCallback(async () => {
    if (!hasToken || !inElectron) return;
    try {
      const r = await listRepos();
      setRepos(r);
      if (r.length > 0 && selectedRepos.length === 0) {
        const initial = [r[0]];
        setSelectedRepos_state(initial);
        if (inElectron) setSelectedRepos(initial);
      }
    } catch (e) {
      const parsed = parseErrorMessage(toMessage(e));
      setError(buildErrorCode(parsed));
    }
  }, [hasToken, inElectron, selectedRepos]);

  const loadFlows = useCallback(async (repoList: string[]) => {
    if (!repoList.length || !hasToken || !inElectron) return;
    const generation = ++loadGenRef.current;
    setLoading(true);
    try {
      const results = await Promise.all(repoList.map((r) => getFeatureFlows(r)));
      if (generation !== loadGenRef.current) return;
      const data = results.flat();
      setFlows((prev) => {
        const dataMap = new Map(data.map((f) => [f.id, f]));
        const existingIds = new Set(prev.map((f) => f.id));
        const merged = prev.map((f) => {
          const updated = dataMap.get(f.id);
          return updated ? { ...f, ...updated } : f;
        });
        const newFlows = data.filter((f) => !existingIds.has(f.id));
        return [...merged, ...newFlows];
      });
      setError(null);
      setLastUpdatedAt(new Date());
      consecutiveFailuresRef.current = 0;
      setAutoRefreshPaused(false);

      // Notifications
      const currentIds = new Set(data.flatMap((f) => f.needsAttention.map((a) => `${f.id}:${a.reason}`)));
      if (!isFirstPollRef.current) {
        const newItems = [...currentIds]
          .filter((id) => !prevAttentionIdsRef.current.has(id))
          .map((id) => {
            const [flowId, reason] = id.split(":");
            const flow = data.find((f) => f.id === flowId);
            return { id, reason: ATTENTION_REASON_LABELS[reason] ?? reason, title: flow?.title ?? "" };
          });
        if (newItems.length > 0) reportAttention(newItems);
      }
      isFirstPollRef.current = false;
      prevAttentionIdsRef.current = currentIds;
    } catch (e) {
      if (generation !== loadGenRef.current) return;
      const parsed = parseErrorMessage(toMessage(e));
      consecutiveFailuresRef.current += 1;

      if (parsed.code === "RATE_LIMIT") {
        stopPolling();
        setAutoRefreshPaused(true);
        const resetEpoch = parsed.rateLimitReset ?? 0;
        const resetTime = formatResetTime(resetEpoch);
        setError(`RATE_LIMIT:${resetEpoch}:${resetTime}`);
        if (resetEpoch) {
          const msUntilReset = resetEpoch * 1000 - Date.now() + 5000;
          if (msUntilReset > 0) {
            if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
            rateLimitTimerRef.current = setTimeout(() => {
              setError(null);
              setAutoRefreshPaused(false);
              consecutiveFailuresRef.current = 0;
            }, msUntilReset);
          }
        }
      } else if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        stopPolling();
        setAutoRefreshPaused(true);
        setError(`PAUSED:${buildErrorCode(parsed)}`);
      } else {
        setError(buildErrorCode(parsed));
      }
    } finally {
      if (generation === loadGenRef.current) setLoading(false);
    }
  }, [hasToken, inElectron, stopPolling]);

  // Load repos when token is set
  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // Load flows when repo changes
  useEffect(() => {
    if (selectedRepos.length > 0) {
      consecutiveFailuresRef.current = 0;
      setAutoRefreshPaused(false);
      loadFlows(selectedRepos);
    }
  }, [selectedRepos, loadFlows]);

  // Polling
  useEffect(() => {
    stopPolling();
    if (hasToken && selectedRepos.length > 0 && inElectron && !autoRefreshPaused) {
      pollRef.current = setInterval(() => loadFlows(selectedRepos), POLL_INTERVAL);
    }
    return () => stopPolling();
  }, [hasToken, selectedRepos, inElectron, loadFlows, autoRefreshPaused, stopPolling]);

  const handleRestartPolling = useCallback(() => {
    consecutiveFailuresRef.current = 0;
    setAutoRefreshPaused(false);
    setError(null);
    if (selectedRepos.length > 0) loadFlows(selectedRepos);
  }, [selectedRepos, loadFlows]);

  const handleConnected = async (login: string) => {
    setHasToken(true);
    setUserLogin(login);
    setUseMock(false);
    setFlows([]);
    setShowSettings(false);
    consecutiveFailuresRef.current = 0;
    setAutoRefreshPaused(false);
    setSelectedRepos_state([]);
    await loadRepos();
  };

  const handleClearToken = async () => {
    if (inElectron) await clearToken();
    setHasToken(false);
    setUserLogin(undefined);
    setRepos([]);
    setSelectedRepos_state([]);
    setFlows(MOCK_FLOWS);
    setUseMock(true);
    setShowSettings(false);
  };

  const handleSelectRepos = (repos: string[]) => {
    setSelectedRepos_state(repos);
    setFlows([]);
    if (inElectron) setSelectedRepos(repos);
  };

  const displayed = useMock
    ? MOCK_FLOWS
    : onlyNeedsAttention
    ? flows.filter((f) => f.needsAttention.length > 0)
    : flows;

  const needsAttentionCount = (useMock ? MOCK_FLOWS : flows).filter((f) => f.needsAttention.length > 0).length;

  const activeAgentCount = (useMock ? MOCK_FLOWS : flows)
    .flatMap((f) => f.stages)
    .flatMap((s) => s.satellites)
    .filter((sat) => sat.kind === "agent" && sat.status === "running").length;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#080E14" }}>
      <BoardHeader
        needsAttentionCount={needsAttentionCount}
        activeAgentCount={activeAgentCount}
        onlyNeedsAttention={onlyNeedsAttention}
        onToggleFilter={() => setOnlyNeedsAttention((v) => !v)}
        repos={repos}
        selectedRepos={selectedRepos}
        onSelectRepos={handleSelectRepos}
        onOpenSettings={() => setShowSettings(true)}
        onNewWorkflow={() => setShowNewWorkflow(true)}
        hasToken={hasToken || useMock}
        loading={loading}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={() => {
          if (autoRefreshPaused) {
            handleRestartPolling();
          } else {
            loadFlows(selectedRepos);
          }
        }}
      />

      <div className="flex-1 overflow-y-auto relative">
        {/* Empty state — no token */}
        {!useMock && !hasToken && (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "#5A7389" }}>
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(56,225,198,0.06)", border: "1px solid rgba(56,225,198,0.15)" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ color: "#38E1C6" }}>
                <path d="M3 11h18M11 3l8 8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: "#CDD6DF" }}>
                Connect your GitHub repository
              </p>
              <p className="text-xs max-w-xs leading-relaxed" style={{ color: "#5A7389" }}>
                Connect your GitHub account to see PRs and agents flowing from code to production.
              </p>
            </div>
            <button
              className="text-xs px-4 py-2 rounded-lg font-semibold mt-1 transition-opacity hover:opacity-90"
              style={{ background: "#38E1C6", color: "#080E14" }}
              onClick={() => setShowSettings(true)}
            >
              Connect GitHub
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && <ErrorBanner error={error} onOpenSettings={() => setShowSettings(true)} onRestart={handleRestartPolling} />}

        {/* Mock mode banner */}
        {useMock && (
          <div
            className="mx-4 mt-3 px-4 py-2.5 rounded-lg text-xs flex items-center gap-3"
            style={{
              background: "rgba(56,225,198,0.05)",
              border: "1px solid rgba(56,225,198,0.15)",
              color: "#5A7389",
            }}
          >
            <span style={{ color: "#3A5068" }}>●</span>
            <span>Demo mode — <span style={{ color: "#8CA8BE" }}>PRs flowing from code → production. Red = needs attention.</span></span>
            <button
              className="text-xs font-semibold ml-auto flex-shrink-0 px-3 py-1 rounded-md transition-opacity hover:opacity-90"
              style={{ background: "#38E1C6", color: "#080E14" }}
              onClick={() => setShowSettings(true)}
            >
              Connect GitHub →
            </button>
          </div>
        )}

        {/* Workflow runs */}
        {workflowRuns.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-xs font-semibold mb-2 tracking-widest uppercase" style={{ color: "#3A5068", letterSpacing: "0.1em" }}>
              Workflows
            </p>
            {workflowRuns.map((run) => (
              <WorkflowRunCard
                key={run.id}
                run={run}
                onClick={() => setActiveLogRun(run)}
              />
            ))}
          </div>
        )}

        {/* Board */}
        {displayed.length > 0 && (
          <div className="px-4 pt-2 pb-6">
            <StageHeaderRow />
            <div className="mt-2">
              {displayed.map((flow) => (
                <FlowRow key={flow.id} flow={flow} calm={needsAttentionCount > 0} />
              ))}
            </div>
          </div>
        )}

        {/* Empty filtered state */}
        {!useMock && hasToken && displayed.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "#2E4257" }}>
              <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {onlyNeedsAttention ? (
              <p className="text-sm" style={{ color: "#5A7389" }}>Nothing needs your attention right now.</p>
            ) : (
              <p className="text-sm" style={{ color: "#5A7389" }}>No open pull requests found.</p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && flows.length === 0 && (
          <div className="flex items-center justify-center h-32 gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38E1C6", animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38E1C6", animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38E1C6", animationDelay: "300ms" }} />
          </div>
        )}
        {/* Legend button — floating bottom-right corner */}
        <div className="fixed bottom-4 right-4 z-20">
          <Legend />
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          hasToken={hasToken}
          login={userLogin}
          onConnected={handleConnected}
          onClear={handleClearToken}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showNewWorkflow && (
        <NewWorkflowModal
          onCreated={(runs) => {
            setWorkflowRuns((prev) => [...runs, ...prev]);
            setShowNewWorkflow(false);
            if (runs[0]) setActiveLogRun(runs[0]);
          }}
          onClose={() => setShowNewWorkflow(false)}
        />
      )}

      {activeLogRun && (
        <LogDrawer
          run={activeLogRun}
          onClose={() => setActiveLogRun(null)}
        />
      )}
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────

interface ErrorBannerProps {
  error: string;
  onOpenSettings: () => void;
  onRestart: () => void;
}

function ErrorBanner({ error, onOpenSettings, onRestart }: ErrorBannerProps) {
  const paused = error.startsWith("PAUSED:");
  const inner = paused ? error.slice("PAUSED:".length) : error;

  let heading = "";
  let detail = "";
  let cta: "settings" | "restart" | "none" = "none";

  if (inner === "AUTH_401") {
    heading = "GitHub authorization expired.";
    detail = "Reconnect your GitHub account in Settings.";
    cta = "settings";
  } else if (inner.startsWith("RATE_LIMIT:")) {
    const parts = inner.split(":");
    const humanTime = parts[2] ?? "";
    heading = humanTime
      ? `GitHub rate limit hit — resets at ${humanTime}.`
      : "GitHub rate limit hit.";
    detail = "Auto-refresh is paused to avoid wasting quota.";
    cta = "restart";
  } else if (inner === "SCOPE_403") {
    heading = "GitHub returned 403 — insufficient scopes.";
    detail = "Reconnect in Settings to re-authorize with repo access.";
    cta = "settings";
  } else if (inner === "NOT_FOUND_404") {
    heading = "Repo not found or your account lacks access.";
    detail = "Check the selected repo and your GitHub permissions.";
    cta = "settings";
  } else if (inner === "NETWORK") {
    heading = "Cannot reach GitHub — check your internet connection.";
    detail = paused ? "Auto-refresh stopped after repeated failures." : "";
    cta = paused ? "restart" : "none";
  } else {
    heading = "Failed to load data from GitHub.";
    detail = inner;
    cta = paused ? "restart" : "none";
  }

  if (paused && cta === "none") cta = "restart";

  return (
    <div
      className="mx-4 mt-3 px-4 py-3 rounded text-sm flex flex-col gap-2"
      style={{ background: "rgba(242,97,78,0.08)", border: "1px solid rgba(242,97,78,0.25)", color: "#F2614E" }}
    >
      <span className="font-medium">{heading}</span>
      {detail && <span className="text-xs" style={{ color: "#8CA8BE" }}>{detail}</span>}
      {cta === "settings" && (
        <button className="self-start text-xs underline hover:no-underline" style={{ color: "#F2614E" }} onClick={onOpenSettings}>
          Open Settings →
        </button>
      )}
      {cta === "restart" && (
        <button className="self-start text-xs underline hover:no-underline" style={{ color: "#F2614E" }} onClick={onRestart}>
          Click to retry and restart auto-refresh →
        </button>
      )}
    </div>
  );
}
