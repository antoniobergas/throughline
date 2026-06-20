import { useEffect, useRef, useState } from "react";
import { startGitHubAuth, cancelGitHubAuth, onAuthResult, isElectron } from "../electronApi";

interface Props {
  hasToken: boolean;
  login?: string;
  onConnected: (login: string) => void;
  onClear: () => void;
  onClose: () => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "waiting"; user_code: string; verification_uri: string }
  | { kind: "success"; login: string }
  | { kind: "error"; message: string };

function formatCode(code: string): string {
  // GitHub user codes are usually "ABCD-1234" already — just display as-is
  return code;
}

export default function SettingsModal({ hasToken, login, onConnected, onClear, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const inElectron = isElectron();

  // Register auth result listener when in "waiting" phase
  useEffect(() => {
    if (phase.kind !== "waiting") return;
    const cleanup = onAuthResult((result) => {
      if (result.ok) {
        setPhase({ kind: "success", login: result.login });
        // Brief success flash, then notify parent
        setTimeout(() => onConnected(result.login), 1200);
      } else {
        const msg = result.error === "CODE_EXPIRED"
          ? "The code expired. Please try again."
          : result.error === "ACCESS_DENIED"
          ? "Authorization was denied."
          : `Authorization failed: ${result.error}`;
        setPhase({ kind: "error", message: msg });
      }
    });
    cleanupRef.current = cleanup;
    return cleanup;
  }, [phase.kind, onConnected]);

  // Cancel polling when modal unmounts while waiting
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
      if (phase.kind === "waiting") cancelGitHubAuth().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    if (!inElectron) return;
    setPhase({ kind: "idle" }); // reset
    try {
      const data = await startGitHubAuth();
      setPhase({ kind: "waiting", user_code: data.user_code, verification_uri: data.verification_uri });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("NO_CLIENT_ID")) {
        setPhase({
          kind: "error",
          message: "OAuth App not configured. Set GITHUB_OAUTH_CLIENT_ID in src/main/auth.ts.",
        });
      } else {
        setPhase({ kind: "error", message: `Could not start auth: ${msg}` });
      }
    }
  };

  const handleCancel = async () => {
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    await cancelGitHubAuth().catch(() => {});
    setPhase({ kind: "idle" });
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const isBusy = phase.kind === "waiting";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(8,14,20,0.88)" }}
      onClick={isBusy ? undefined : onClose}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md shadow-2xl mx-3"
        style={{ background: "#0D1825", border: "1px solid #1E2D3D" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold tracking-tight" style={{ color: "#CDD6DF" }}>
            GitHub Connection
          </h2>
          <button
            onClick={isBusy ? undefined : onClose}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-white/5 transition-colors"
            style={{ color: "#5A7389" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Connected state */}
        {hasToken && phase.kind === "idle" && (
          <div className="mb-5">
            <div
              className="flex items-center gap-3 rounded-lg px-4 py-3"
              style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}
            >
              {/* GitHub mark */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#4ADE80", flexShrink: 0 }}>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: "#4ADE80" }}>Connected</p>
                {login && (
                  <p className="text-sm font-mono mt-0.5" style={{ color: "#CDD6DF" }}>@{login}</p>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs" style={{ color: "#5A7389" }}>
              throughline has read access to your repositories, pull requests, checks, and deployments.
            </p>
          </div>
        )}

        {/* Not connected — idle */}
        {!hasToken && phase.kind === "idle" && (
          <div className="mb-5">
            <p className="text-xs leading-relaxed mb-4" style={{ color: "#5A7389" }}>
              Connect your GitHub account to see pull requests and agents flowing from code to production.
              throughline requests <span style={{ color: "#8CA8BE" }}>repo</span> access — read-only on public and private repos.
            </p>
          </div>
        )}

        {/* Waiting for device auth */}
        {phase.kind === "waiting" && (
          <div className="mb-5">
            <p className="text-xs mb-3" style={{ color: "#8CA8BE" }}>
              GitHub opened in your browser. Enter this code to authorize:
            </p>
            {/* Code display */}
            <button
              className="w-full flex items-center justify-between rounded-lg px-4 py-3 font-mono transition-colors"
              style={{
                background: "#080E14",
                border: "1px solid #2E4257",
                color: "#38E1C6",
                fontSize: "22px",
                letterSpacing: "0.15em",
              }}
              onClick={() => handleCopy(phase.user_code)}
              title="Click to copy"
            >
              <span>{formatCode(phase.user_code)}</span>
              <span className="text-xs ml-3" style={{ color: copied ? "#4ADE80" : "#3A5068", letterSpacing: "normal", fontSize: "11px" }}>
                {copied ? "Copied!" : "Copy"}
              </span>
            </button>
            {/* Waiting indicator */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full" style={{ background: "#38E1C6", animation: "status-dot-pulse 1.5s ease-in-out infinite", animationDelay: "0ms" }} />
                <div className="w-1 h-1 rounded-full" style={{ background: "#38E1C6", animation: "status-dot-pulse 1.5s ease-in-out infinite", animationDelay: "200ms" }} />
                <div className="w-1 h-1 rounded-full" style={{ background: "#38E1C6", animation: "status-dot-pulse 1.5s ease-in-out infinite", animationDelay: "400ms" }} />
              </div>
              <span className="text-xs" style={{ color: "#5A7389" }}>Waiting for authorization on GitHub…</span>
            </div>
            <p className="mt-2 text-xs" style={{ color: "#3A5068" }}>
              Didn't open?{" "}
              <button
                className="underline hover:no-underline"
                style={{ color: "#5A7389", background: "transparent", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
                onClick={() => { if (typeof window !== "undefined") window.open(phase.verification_uri, "_blank"); }}
              >
                {phase.verification_uri}
              </button>
            </p>
          </div>
        )}

        {/* Success flash */}
        {phase.kind === "success" && (
          <div className="mb-5 flex items-center gap-3 rounded-lg px-4 py-3"
            style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#4ADE80", flexShrink: 0 }}>
              <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm" style={{ color: "#4ADE80" }}>
              Connected as <span className="font-mono">@{phase.login}</span>
            </p>
          </div>
        )}

        {/* Error */}
        {phase.kind === "error" && (
          <div className="mb-5 rounded-lg px-4 py-3"
            style={{ background: "rgba(242,97,78,0.08)", border: "1px solid rgba(242,97,78,0.25)" }}>
            <p className="text-xs" style={{ color: "#F2614E" }}>{phase.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {phase.kind === "waiting" ? (
            <button
              className="flex-1 py-2.5 rounded text-sm font-medium transition-colors hover:bg-white/5 min-h-[44px]"
              style={{ border: "1px solid #1E2D3D", color: "#5A7389" }}
              onClick={handleCancel}
            >
              Cancel
            </button>
          ) : hasToken && phase.kind === "idle" ? (
            <>
              <button
                className="py-2.5 px-4 rounded text-sm font-medium transition-colors hover:bg-white/5 min-h-[44px]"
                style={{ border: "1px solid #1E2D3D", color: "#F2614E" }}
                onClick={onClear}
              >
                Disconnect
              </button>
              <button
                className="flex-1 py-2.5 rounded text-sm font-medium transition-colors min-h-[44px] hover:brightness-110"
                style={{ background: "#1E2D3D", color: "#8CA8BE" }}
                onClick={onClose}
              >
                Close
              </button>
            </>
          ) : (
            <button
              className="flex-1 py-2.5 rounded text-sm font-medium transition-all min-h-[44px] hover:brightness-110 flex items-center justify-center gap-2"
              style={{ background: "#38E1C6", color: "#080E14" }}
              onClick={handleConnect}
              disabled={!inElectron || phase.kind === "error" === false && phase.kind === "success"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Connect with GitHub
            </button>
          )}
        </div>

        {!inElectron && (
          <p className="mt-3 text-xs text-center" style={{ color: "#3A5068" }}>
            OAuth is only available in the desktop app.
          </p>
        )}
      </div>
    </div>
  );
}
