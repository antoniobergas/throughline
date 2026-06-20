import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureFlow } from "../../shared/types";
import { MOCK_FLOWS } from "./mockData";
import { getSettings, setToken, clearToken, listRepos, getFeatureFlows, setSelectedRepo as persistSelectedRepo, isElectron } from "./electronApi";
import BoardHeader from "./components/BoardHeader";
import StageHeaderRow from "./components/StageHeaderRow";
import FlowRow from "./components/FlowRow";
import SettingsModal from "./components/SettingsModal";
import Legend from "./components/Legend";

const POLL_INTERVAL = 30_000;
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

export default function App() {
  const [token, setTokenState] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repos, setRepos] = useState<string[]>([]);
  const [flows, setFlows] = useState<FeatureFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadGenRef = useRef<number>(0);

  const hasToken = !!token;
  const inElectron = isElectron();

  // Load settings on mount
  useEffect(() => {
    if (!inElectron) {
      setUseMock(true);
      setFlows(MOCK_FLOWS);
      return;
    }
    getSettings()
      .then((s) => {
        if (s.token) setTokenState(s.token);
        if (s.selectedRepo) setSelectedRepo(s.selectedRepo);
      })
      .catch(() => {
        setUseMock(true);
        setFlows(MOCK_FLOWS);
      });
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
      if (r.length > 0 && !selectedRepo) setSelectedRepo(r[0]);
    } catch (e) {
      const parsed = parseErrorMessage(toMessage(e));
      setError(buildErrorCode(parsed));
    }
  }, [hasToken, inElectron, selectedRepo]);

  const loadFlows = useCallback(async (repo: string) => {
    if (!repo || !hasToken || !inElectron) return;
    const generation = ++loadGenRef.current;
    setLoading(true);
    try {
      const data = await getFeatureFlows(repo);
      if (generation !== loadGenRef.current) return;
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
    if (selectedRepo) {
      consecutiveFailuresRef.current = 0;
      setAutoRefreshPaused(false);
      loadFlows(selectedRepo);
    }
  }, [selectedRepo, loadFlows]);

  // Polling
  useEffect(() => {
    stopPolling();
    if (hasToken && selectedRepo && inElectron && !autoRefreshPaused) {
      pollRef.current = setInterval(() => loadFlows(selectedRepo), POLL_INTERVAL);
    }
    return () => stopPolling();
  }, [hasToken, selectedRepo, inElectron, loadFlows, autoRefreshPaused, stopPolling]);

  const handleRestartPolling = useCallback(() => {
    consecutiveFailuresRef.current = 0;
    setAutoRefreshPaused(false);
    setError(null);
    if (selectedRepo) loadFlows(selectedRepo);
  }, [selectedRepo, loadFlows]);

  const handleSaveToken = async (t: string) => {
    if (inElectron) await setToken(t);
    setTokenState(t);
    setUseMock(false);
    setFlows([]);
    setShowSettings(false);
    consecutiveFailuresRef.current = 0;
    setAutoRefreshPaused(false);
    await loadRepos();
  };

  const handleClearToken = async () => {
    if (inElectron) await clearToken();
    setTokenState("");
    setRepos([]);
    setFlows(MOCK_FLOWS);
    setUseMock(true);
    setShowSettings(false);
  };

  const handleSelectRepo = (r: string) => {
    setSelectedRepo(r);
    setFlows([]);
    if (inElectron) persistSelectedRepo(r);
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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0E1620" }}>
      <BoardHeader
        needsAttentionCount={needsAttentionCount}
        activeAgentCount={activeAgentCount}
        onlyNeedsAttention={onlyNeedsAttention}
        onToggleFilter={() => setOnlyNeedsAttention((v) => !v)}
        repos={repos}
        selectedRepo={selectedRepo}
        onSelectRepo={handleSelectRepo}
        onOpenSettings={() => setShowSettings(true)}
        hasToken={hasToken || useMock}
        loading={loading}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={() => {
          if (autoRefreshPaused) {
            handleRestartPolling();
          } else if (selectedRepo) {
            loadFlows(selectedRepo);
          }
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Empty state — no token */}
        {!useMock && !hasToken && (
          <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "#7E93A6" }}>
            <div className="text-4xl">⟳</div>
            <p className="text-base font-medium" style={{ color: "#E8EEF2" }}>
              Connect to GitHub to get started
            </p>
            <p className="text-sm text-center max-w-xs">
              Add a fine-grained PAT in Settings to see your PRs flow from coding agents to production.
            </p>
            <button
              className="px-4 py-2 rounded text-sm font-medium mt-2 hover:brightness-110 transition-all"
              style={{ background: "#38E1C6", color: "#0E1620" }}
              onClick={() => setShowSettings(true)}
            >
              Open Settings
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && <ErrorBanner error={error} onOpenSettings={() => setShowSettings(true)} onRestart={handleRestartPolling} />}

        {/* Mock mode banner */}
        {useMock && (
          <div
            className="mx-4 mt-3 px-4 py-2.5 rounded text-xs flex items-center gap-2"
            style={{ background: "rgba(56,225,198,0.08)", border: "1px solid rgba(56,225,198,0.2)", color: "#38E1C6" }}
          >
            <span>Demo — sample data. Connect a GitHub repo to see your real PRs.</span>
            <button
              className="px-3 py-1 rounded text-xs font-medium ml-auto flex-shrink-0 hover:brightness-110 transition-all"
              style={{ background: "#38E1C6", color: "#0E1620" }}
              onClick={() => setShowSettings(true)}
            >
              Add a token →
            </button>
          </div>
        )}

        {/* Board */}
        {displayed.length > 0 && (
          <div className="px-4 pt-3 pb-4">
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
          <div className="flex flex-col items-center justify-center h-64 gap-2" style={{ color: "#7E93A6" }}>
            <span className="text-2xl">✓</span>
            {onlyNeedsAttention ? (
              <p className="text-sm">Nothing needs your attention.</p>
            ) : (
              <>
                <p className="text-sm">No open PRs{selectedRepo ? ` in ${selectedRepo}` : ""}.</p>
                <p className="text-xs text-center max-w-xs mt-1">
                  Verify your token has the{" "}
                  <span style={{ color: "#E8EEF2" }}>Pull requests</span> scope.
                  {repos.length > 1 && " You can also switch to a different repo above."}
                </p>
              </>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && flows.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <span className="text-sm animate-pulse" style={{ color: "#7E93A6" }}>
              Loading flows…
            </span>
          </div>
        )}
      </div>

      <Legend />

      {showSettings && (
        <SettingsModal
          currentToken={token}
          hasToken={hasToken}
          onSave={handleSaveToken}
          onClear={handleClearToken}
          onClose={() => setShowSettings(false)}
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
    heading = "Your GitHub token is invalid or expired.";
    detail = "Update your PAT in Settings to restore access.";
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
    heading = "GitHub returned 403 — insufficient token scopes.";
    detail = "Open Settings and confirm your PAT has: Pull requests, Checks, Deployments, Actions.";
    cta = "settings";
  } else if (inner === "NOT_FOUND_404") {
    heading = "Repo not found or your token lacks access.";
    detail = "Check the selected repo and your PAT permissions.";
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
      style={{ background: "rgba(242,97,78,0.1)", border: "1px solid rgba(242,97,78,0.3)", color: "#F2614E" }}
    >
      <span className="font-medium">{heading}</span>
      {detail && <span className="text-xs" style={{ color: "#C96B5E" }}>{detail}</span>}
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
