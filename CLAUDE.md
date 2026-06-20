# throughline — engineering context

## Product north star

throughline exists so a developer can run **many changes/agents in parallel while holding almost nothing in their head and never tab-hunting**.

### Four non-negotiable principles

1. **Calm by default, loud on exception.** Changes that are fine stay quiet and low-contrast. Only items that need the human (`needsAttention`) draw the eye.
2. **Glanceable in ~2 seconds.** State is read from position + colour, not text. Minimal text on the board; detail on hover/click.
3. **One click to act.** Every box/satellite/attention item deep-links to the exact GitHub artifact (`url`/`logUrl`).
4. **Stable spatial map.** Rows hold their position. Main list order is by `updatedAt` desc — never reorder on every poll.

## Architecture

- **Frontend:** `src/` — React 18 + TypeScript + Vite + Tailwind
- **Backend:** `src-tauri/src/` — Rust (Tauri v2 commands)
- GitHub data: pure Rust via `reqwest` + raw GitHub REST API. No octocrab (avoided dep bloat).
- Token storage: `tauri-plugin-store` → never exposed to webview
- URL opening: `tauri-plugin-opener` → system browser

## Data model (`src/types.ts` mirrors Rust serde structs)

```
StageId: work | pr | checks | review | merge | deploy | prod
StageState: pending | active | done | failed | no_data
SatelliteKind: agent | subagent | ai_review | environment
SatelliteStatus: running | passed | failed | waiting
AttentionReason: check_failed | review_requested | changes_requested |
                 deploy_waiting_approval | deploy_failed | merge_conflict
```

## GitHub → FeatureFlow mapping rules

- **WORK:** infer from PR author (Copilot → agent satellite). `done` once PR exists.
- **PR:** `done` if open/merged. `url=PR html_url`.
- **CHECKS:** aggregate check runs for head SHA. `failed` on any failure, `active` if in_progress/queued, `done` if all pass. `logUrl=` failing run's `details_url`.
- **REVIEW:** PR reviews + requested reviewers. `ai_review` satellite per Copilot review. Scope "review_requested" to authenticated user.
- **MERGE:** `done` if merged, `active` if clean+approved, `pending` otherwise. `merge_conflict` attention if `mergeable_state = dirty`.
- **DEPLOY:** correlate by `merge_commit_sha` (not head SHA) against Deployments API. Non-prod environments → satellites. `waiting` if environment protection gate.
- **PROD:** production environment deployment for the merge SHA.
- **Never invent a signal** — use `no_data`.

## Colour tokens

```
canvas #0E1620  panel #16212E  rail/border #2A3949
text #E8EEF2  muted #7E93A6
teal #38E1C6  violet #8B7BF0  green #6FD08C  amber #F4A94B  coral #F2614E
```

Satellite accent: agent=teal, subagent=teal-dim (#1a8a7a), ai_review=violet, environment=green

## Tauri commands

`get_settings` · `set_token(token)` · `clear_token` · `list_repos` · `get_feature_flows(repo)`

## Build notes (Windows + MinGW)

- Toolchain: `stable-x86_64-pc-windows-gnu` (MSVC unavailable without VS Build Tools)
- Linker: MinGW GCC from `C:\msys64\mingw64\bin`, configured in `src-tauri/.cargo/config.toml`
- Crate type: `rlib` only (cdylib hits PE 65535-export ordinal limit with Tauri's large symbol count)

## Phase plan

1. ✅ Scaffold + mock board
2. ✅ Settings + secure token storage
3. ✅ Rust GitHub client + list_repos
4. ✅ get_feature_flows: PR → CHECKS → REVIEW → MERGE
5. ✅ needsAttention derivation + filter
6. ✅ WORK satellites (Copilot degrade)
7. ✅ DEPLOY/PROD via GitHub Environments (merge_commit_sha correlation)
8. 🔲 Self-review pass vs mockup + principles

## Next phases (out of scope now)

- Argo CD provider behind a `DeployProvider` seam
- Exception/alerting mode: notify on `needsAttention`
