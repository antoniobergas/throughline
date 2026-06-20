import { useState } from "react";
import { testToken, isElectron, openUrl } from "../electronApi";

interface Props {
  currentToken: string;
  onSave: (token: string) => Promise<void>;
  onClear: () => void;
  onClose: () => void;
  hasToken: boolean;
}

type SaveStatus = "idle" | "testing" | "saving" | "error";

export default function SettingsModal({ currentToken, onSave, onClear, onClose, hasToken }: Props) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const inElectron = isElectron();

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    setErrorMsg("");

    if (inElectron) {
      setStatus("testing");
      try {
        await testToken(trimmed);
      } catch (e) {
        const msg = String(e);
        setStatus("error");
        if (msg.includes("AUTH_401")) {
          setErrorMsg("Token rejected by GitHub (401). Check the token value and its scopes.");
        } else if (msg.includes("NETWORK")) {
          setErrorMsg("Could not reach GitHub. Check your internet connection and try again.");
        } else {
          setErrorMsg(`GitHub rejected the token: ${msg}`);
        }
        return;
      }
    }

    setStatus("saving");
    try {
      await onSave(trimmed);
    } catch (e) {
      setStatus("error");
      setErrorMsg(String(e));
    }
  };

  const isBusy = status === "testing" || status === "saving";

  const buttonLabel = (() => {
    if (status === "testing") return "Verifying token…";
    if (status === "saving") return "Saving…";
    if (hasToken && !draft.trim()) return "Token already saved";
    return "Save token";
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(14,22,32,0.85)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      onClick={isBusy ? undefined : onClose}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md shadow-2xl mx-3"
        style={{ background: "#16212E", border: "1px solid #2A3949" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#E8EEF2" }}>
            Settings
          </h2>
          <button
            onClick={isBusy ? undefined : onClose}
            className="flex items-center justify-center w-11 h-11 rounded hover:bg-white/5 transition-colors"
            style={{ color: "#7E93A6", fontSize: "20px" }}
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#7E93A6" }}>
            GitHub Fine-Grained PAT
          </label>
          {hasToken && !draft && (
            <div className="flex items-center gap-1.5 mt-1.5 mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#6FD08C" }} />
              <span className="text-xs" style={{ color: "#6FD08C" }}>Token saved</span>
            </div>
          )}
          <input
            type="password"
            className="w-full rounded px-3 py-2 outline-none font-mono"
            style={{ background: "#0E1620", border: "1px solid #2A3949", color: "#E8EEF2", fontSize: "16px" }}
            placeholder="github_pat_…"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); if (status === "error") setStatus("idle"); }}
            disabled={isBusy}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <p className="mt-2 text-xs" style={{ color: "#7E93A6" }}>
            Required scopes: Metadata, Contents, Pull requests, Actions, Checks, Commit statuses, Deployments, Environments.{" "}
            <button
              className="underline hover:no-underline"
              style={{ color: "#38E1C6", background: "transparent", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
              onClick={() => openUrl("https://github.com/settings/tokens?type=beta")}
              type="button"
            >
              Create token on GitHub →
            </button>
          </p>

          {status === "error" && errorMsg && (
            <p className="mt-2 text-xs" style={{ color: "#F2614E" }}>
              {errorMsg}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 py-2 rounded text-sm font-medium transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            style={{ background: "#38E1C6", color: "#0E1620" }}
            onClick={handleSave}
            disabled={isBusy || !draft.trim() || draft.trim() === currentToken}
          >
            {buttonLabel}
          </button>
          {hasToken && (
            <button
              className="py-2 px-4 rounded text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              style={{ border: "1px solid #2A3949", color: "#F2614E" }}
              onClick={onClear}
              disabled={isBusy}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
