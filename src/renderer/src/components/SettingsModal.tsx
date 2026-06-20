import { useState } from "react";

interface Props {
  currentToken: string;
  onSave: (token: string) => void;
  onClear: () => void;
  onClose: () => void;
  hasToken: boolean;
}

export default function SettingsModal({ currentToken, onSave, onClear, onClose, hasToken }: Props) {
  const [draft, setDraft] = useState(currentToken);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(14,22,32,0.85)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md shadow-2xl"
        style={{ background: "#16212E", border: "1px solid #2A3949" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#E8EEF2" }}>
            Settings
          </h2>
          <button onClick={onClose} className="text-lg" style={{ color: "#7E93A6" }}>
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#7E93A6" }}>
            GitHub Fine-Grained PAT
          </label>
          <input
            type="password"
            className="w-full rounded px-3 py-2 text-sm outline-none font-mono"
            style={{ background: "#0E1620", border: "1px solid #2A3949", color: "#E8EEF2" }}
            placeholder="github_pat_…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <p className="mt-2 text-xs" style={{ color: "#7E93A6" }}>
            Required scopes: Metadata, Contents, Pull requests, Actions, Checks, Commit statuses, Deployments, Environments
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 py-2 rounded text-sm font-medium transition-colors hover:brightness-110"
            style={{ background: "#38E1C6", color: "#0E1620" }}
            onClick={() => { if (draft.trim()) onSave(draft.trim()); }}
          >
            Save token
          </button>
          {hasToken && (
            <button
              className="py-2 px-4 rounded text-sm font-medium transition-colors hover:bg-white/5"
              style={{ border: "1px solid #2A3949", color: "#F2614E" }}
              onClick={onClear}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
