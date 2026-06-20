import { useEffect, useRef, useState } from "react";
import type { AgentProviderInfo, WorkflowRun, AgentProviderId } from "../../../shared/types";
import { getAgentProviders, createWorkflow, pickLocalFolder, slugifyBranch, listRepos } from "../electronApi";

interface Props {
  onCreated: (runs: WorkflowRun[]) => void;
  onClose: () => void;
}

type Step = "source" | "config" | "launching";
type RepoSource = "github" | "local";

const PROVIDER_COLORS: Record<AgentProviderId, string> = {
  "claude-code": "#38E1C6",
  "aider":       "#8B7BF0",
  "copilot":     "#4ADE80",
};

export default function NewWorkflowModal({ onCreated, onClose }: Props) {
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<RepoSource>("github");

  // Repo
  const [githubRepos, setGithubRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [localRemote, setLocalRemote] = useState<string | undefined>();
  const [localError, setLocalError] = useState("");

  // Config
  const [description, setDescription] = useState("");
  const [branch, setBranch] = useState("");
  const [branchEdited, setBranchEdited] = useState(false);
  const [providers, setProviders] = useState<AgentProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AgentProviderId>("claude-code");
  const [subagentCount, setSubagentCount] = useState(1);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");

  const descRef = useRef<HTMLTextAreaElement>(null);

  // Load GitHub repos + provider availability
  useEffect(() => {
    listRepos().then(setGithubRepos).catch(() => {});
    getAgentProviders().then((ps) => {
      setProviders(ps);
      const first = ps.find((p) => p.available);
      if (first) setSelectedProvider(first.id);
    }).catch(() => {});
  }, []);

  // Auto-generate branch from description
  useEffect(() => {
    if (branchEdited || !description.trim()) return;
    slugifyBranch(description).then(setBranch).catch(() => {});
  }, [description, branchEdited]);

  const repo = source === "github" ? selectedRepo : localPath;
  const isLocal = source === "local";
  const canProceedFromSource = source === "github" ? !!selectedRepo : !!localPath;
  const canLaunch = !!description.trim() && !!branch.trim() && !!selectedProvider;

  const handlePickFolder = async () => {
    setLocalError("");
    const result = await pickLocalFolder().catch(() => null);
    if (!result) return;
    if (!result.valid) {
      setLocalError("Not a valid git repository.");
      return;
    }
    setLocalPath(result.path);
    setLocalRemote(result.remote);
  };

  const handleLaunch = async () => {
    if (!canLaunch) return;
    setLaunching(true);
    setLaunchError("");
    try {
      const runs = await createWorkflow({
        repo,
        isLocal,
        branch,
        description,
        provider: selectedProvider,
        subagentCount,
      });
      onCreated(runs);
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : String(e));
      setLaunching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(8,14,20,0.88)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-lg mx-3 shadow-2xl flex flex-col"
        style={{ background: "#0D1825", border: "1px solid #1E2D3D", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1E2D3D" }}>
          <div>
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: "#CDD6DF" }}>New Workflow</h2>
            <p className="text-xs mt-0.5" style={{ color: "#5A7389" }}>
              {step === "source" ? "Choose a repository" : step === "config" ? "Describe the task" : "Launching…"}
            </p>
          </div>
          <button
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-white/5 transition-colors"
            style={{ color: "#5A7389" }}
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── Step: source ── */}
          {step === "source" && (
            <div className="space-y-3">
              {/* Source toggle */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #1E2D3D" }}>
                {(["github", "local"] as RepoSource[]).map((s) => (
                  <button
                    key={s}
                    className="flex-1 py-2 text-xs font-medium transition-colors"
                    style={{
                      background: source === s ? "#1E2D3D" : "transparent",
                      color: source === s ? "#CDD6DF" : "#5A7389",
                    }}
                    onClick={() => setSource(s)}
                  >
                    {s === "github" ? "GitHub repo" : "Local folder"}
                  </button>
                ))}
              </div>

              {source === "github" && (
                <div className="space-y-1">
                  <label className="text-xs" style={{ color: "#5A7389" }}>Repository</label>
                  {githubRepos.length === 0 ? (
                    <p className="text-xs py-2" style={{ color: "#3A5068" }}>No repos found — connect GitHub first.</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-lg" style={{ border: "1px solid #1E2D3D" }}>
                      {githubRepos.map((r) => (
                        <button
                          key={r}
                          className="w-full text-left px-3 py-2.5 text-xs font-mono flex items-center gap-2 transition-colors hover:bg-white/5"
                          style={{
                            color: selectedRepo === r ? "#38E1C6" : "#8CA8BE",
                            borderBottom: "1px solid #1E2D3D",
                            background: selectedRepo === r ? "rgba(56,225,198,0.05)" : "transparent",
                          }}
                          onClick={() => setSelectedRepo(r)}
                        >
                          {selectedRepo === r && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                              <path d="M2 6l3 3 5-5" stroke="#38E1C6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {source === "local" && (
                <div className="space-y-2">
                  <button
                    className="w-full py-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    style={{ border: "1px dashed #2E4257", color: localPath ? "#38E1C6" : "#5A7389" }}
                    onClick={handlePickFolder}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 3.5A1.5 1.5 0 012.5 2h2.586a1 1 0 01.707.293L7 3.5H11.5A1.5 1.5 0 0113 5v6a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 011 11V3.5z" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    {localPath ? localPath : "Select git repository folder…"}
                  </button>
                  {localRemote && (
                    <p className="text-xs font-mono" style={{ color: "#5A7389" }}>
                      remote: {localRemote}
                    </p>
                  )}
                  {localError && (
                    <p className="text-xs" style={{ color: "#F2614E" }}>{localError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step: config ── */}
          {step === "config" && (
            <div className="space-y-4">
              {/* Repo badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#080E14", border: "1px solid #1E2D3D" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "#5A7389", flexShrink: 0 }}>
                  <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 4v4M4 6h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span className="text-xs font-mono truncate" style={{ color: "#8CA8BE" }}>
                  {isLocal ? localPath.split(/[\\/]/).pop() : repo}
                </span>
                <button className="ml-auto text-xs" style={{ color: "#3A5068" }} onClick={() => setStep("source")}>
                  change
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "#8CA8BE" }}>What should the agent do?</label>
                <textarea
                  ref={descRef}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ background: "#080E14", border: "1px solid #1E2D3D", color: "#CDD6DF", lineHeight: "1.5" }}
                  placeholder="Add a dark mode toggle to the settings panel, using the existing color tokens…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "#8CA8BE" }}>Branch name</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none"
                  style={{ background: "#080E14", border: "1px solid #1E2D3D", color: "#8CA8BE" }}
                  value={branch}
                  onChange={(e) => { setBranch(e.target.value); setBranchEdited(true); }}
                  placeholder="feat/my-feature"
                />
              </div>

              {/* Provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "#8CA8BE" }}>Agent</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {providers.map((p) => {
                    const color = PROVIDER_COLORS[p.id] ?? "#5A7389";
                    const active = selectedProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        disabled={!p.available}
                        className="rounded-lg px-2 py-2.5 text-xs font-medium transition-all text-left flex flex-col gap-1"
                        style={{
                          background: active ? `${color}14` : "#080E14",
                          border: `1px solid ${active ? color : "#1E2D3D"}`,
                          color: p.available ? (active ? color : "#5A7389") : "#2E4257",
                          opacity: p.available ? 1 : 0.5,
                          cursor: p.available ? "pointer" : "not-allowed",
                        }}
                        onClick={() => p.available && setSelectedProvider(p.id)}
                      >
                        <span>{p.name}</span>
                        <span className="text-xs" style={{ color: p.available ? (active ? color : "#3A5068") : "#2E4257", fontSize: "10px" }}>
                          {p.available ? (p.kind === "local" ? "local" : "remote") : "not found"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subagent count */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-2" style={{ color: "#8CA8BE" }}>
                  Parallel subagents
                  <span className="text-xs font-normal" style={{ color: "#3A5068" }}>each gets its own branch</span>
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      className="w-10 h-9 rounded-lg text-xs font-mono font-semibold transition-all"
                      style={{
                        background: subagentCount === n ? "rgba(56,225,198,0.12)" : "#080E14",
                        border: `1px solid ${subagentCount === n ? "#38E1C6" : "#1E2D3D"}`,
                        color: subagentCount === n ? "#38E1C6" : "#5A7389",
                      }}
                      onClick={() => setSubagentCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {launchError && (
                <p className="text-xs" style={{ color: "#F2614E" }}>{launchError}</p>
              )}
            </div>
          )}

          {/* ── Launching ── */}
          {step === "launching" && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="flex gap-1.5">
                {Array.from({ length: subagentCount }, (_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#38E1C6", animation: "status-dot-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <p className="text-xs" style={{ color: "#5A7389" }}>
                Spawning {subagentCount === 1 ? "agent" : `${subagentCount} agents`}…
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: "#1E2D3D" }}>
          {step === "source" && (
            <>
              <button
                className="py-2.5 px-4 rounded text-sm hover:bg-white/5 transition-colors min-h-[44px]"
                style={{ border: "1px solid #1E2D3D", color: "#5A7389" }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 rounded text-sm font-semibold transition-all min-h-[44px] disabled:opacity-40"
                style={{ background: "#38E1C6", color: "#080E14" }}
                disabled={!canProceedFromSource}
                onClick={() => setStep("config")}
              >
                Continue →
              </button>
            </>
          )}
          {step === "config" && (
            <>
              <button
                className="py-2.5 px-4 rounded text-sm hover:bg-white/5 transition-colors min-h-[44px]"
                style={{ border: "1px solid #1E2D3D", color: "#5A7389" }}
                onClick={() => setStep("source")}
              >
                ← Back
              </button>
              <button
                className="flex-1 py-2.5 rounded text-sm font-semibold transition-all min-h-[44px] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "#38E1C6", color: "#080E14" }}
                disabled={!canLaunch || launching}
                onClick={async () => { setStep("launching"); await handleLaunch(); }}
              >
                {launching ? "Launching…" : `Launch${subagentCount > 1 ? ` ${subagentCount} agents` : ""}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
