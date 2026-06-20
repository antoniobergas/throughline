# throughline

> A live, agent-native view of a change flowing from coding agents to production.

Each feature is a row flowing left → right through fixed stages:
`WORK → PR → CHECKS → REVIEW │MERGE GATE│ MERGE → DEPLOY → PROD`

## Running

```
npm install
npm run dev
```

Requires Node.js 18+. No Rust, no native toolchain.

## GitHub PAT scopes

Create a **fine-grained PAT** with repo-level **read** permissions:

- Metadata, Contents, Pull requests, Actions, Checks, Commit statuses, Deployments, Environments

Enter it in the app via **Settings (⚙)**. The token is stored in the OS user data directory as a JSON file — never sent anywhere except GitHub's API.

## No token → mock mode

Without a token the app shows a demo board with mock data and a banner pointing to Settings.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (renderer process)
- **Backend:** Electron main process (Node.js), `@octokit/rest` for GitHub API
- **Storage:** Plain JSON file via Node.js `fs` in app userData dir
- **URL opening:** `shell.openExternal()` → system browser
- **Build tool:** electron-vite
