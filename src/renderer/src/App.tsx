import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureFlow } from "../../shared/types";
import { MOCK_FLOWS } from "./mockData";
import { getSettings, setToken, clearToken, listRepos, getFeatureFlows, isElectron } from "./electronApi";
import BoardHeader from "./components/BoardHeader";
import StageHeaderRow from "./components/StageHeaderRow";
import FlowRow from "./components/FlowRow";
import SettingsModal from "./components/SettingsModal";
import Legend from "./components/Legend";

const POLL_INTERVAL = 30_000;

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const loadRepos = useCallback(async () => {
    if (!hasToken || !inElectron) return;
    try {
      const r = await listRepos();
      setRepos(r);
      if (r.length > 0 && !selectedRepo) setSelectedRepo(r[0]);
    } catch (e) {
      setError(`Failed to load repos: ${e}`);
    }
  }, [hasToken, inElectron, selectedRepo]);

  const loadFlows = useCallback(async (repo: string) => {
    if (!repo || !hasToken || !inElectron) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFeatureFlows(repo);
      setFlows((prev) => {
        // Preserve stable order: update existing in-place, append new at end
        const dataMap = new Map(data.map((f) => [f.id, f]));
        const existingIds = new Set(prev.map((f) => f.id));
        const merged = prev.map((f) => dataMap.has(f.id) ? { ...f, ...dataMap.get(f.id)! } : f);
        const newFlows = data.filter((f) => !existingIds.has(f.id));
        return [...merged, ...newFlows];
      });
    } catch (e) {
      setError(`Failed to load flows: ${e}`);
    } finally {
      setLoading(false);
    }
  }, [hasToken, inElectron]);

  // Load repos when token is set
  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // Load flows when repo changes
  useEffect(() => {
    if (selectedRepo) loadFlows(selectedRepo);
  }, [selectedRepo, loadFlows]);

  // Polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (hasToken && selectedRepo && inElectron) {
      pollRef.current = setInterval(() => loadFlows(selectedRepo), POLL_INTERVAL);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [hasToken, selectedRepo, inElectron, loadFlows]);

  const handleSaveToken = async (t: string) => {
    if (inElectron) {
      await setToken(t);
    }
    setTokenState(t);
    setUseMock(false);
    setFlows([]);
    setShowSettings(false);
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
        onRefresh={() => selectedRepo && loadFlows(selectedRepo)}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Empty state */}
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

        {/* Error state */}
        {error && (
          <div
            className="mx-4 mt-3 px-4 py-3 rounded text-sm"
            style={{ background: "rgba(242,97,78,0.1)", border: "1px solid rgba(242,97,78,0.3)", color: "#F2614E" }}
          >
            {error}
          </div>
        )}

        {/* Mock mode banner */}
        {useMock && (
          <div
            className="mx-4 mt-3 px-4 py-2 rounded text-xs flex items-center gap-2"
            style={{ background: "rgba(56,225,198,0.08)", border: "1px solid rgba(56,225,198,0.2)", color: "#38E1C6" }}
          >
            <span>Demo mode — showing mock data.</span>
            <button
              className="underline hover:no-underline ml-auto"
              onClick={() => setShowSettings(true)}
            >
              Add PAT to connect real repo →
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
            <p className="text-sm">
              {onlyNeedsAttention ? "Nothing needs your attention." : "No open PRs found."}
            </p>
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
