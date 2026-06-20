import type { FeatureFlow } from "../../shared/types";

export const MOCK_FLOWS: FeatureFlow[] = [
  // ─── ATTENTION-NEEDING FLOWS ───────────────────────────────────────────────

  // 1. check_failed — Platform team, CI broken on API gateway PR
  {
    id: "flow-01",
    title: "feat: rate-limiting middleware for API gateway",
    branch: "feat/api-gateway-rate-limit",
    headSha: "3f8a1c2",
    repo: "acme/platform",
    updatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    needsAttention: [
      {
        reason: "check_failed",
        stage: "checks",
        url: "https://github.com/acme/platform/actions/runs/9812034",
      },
    ],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/platform/pull/217",
        satellites: [
          {
            id: "sat-01-agent",
            kind: "agent",
            label: "github-copilot[bot]",
            focus: "implementing token-bucket rate limiter with Redis backend",
            status: "passed",
            url: "https://github.com/acme/platform/pull/217",
          },
        ],
      },
      {
        id: "pr",
        state: "done",
        summary: "#217",
        url: "https://github.com/acme/platform/pull/217",
        satellites: [],
      },
      {
        id: "checks",
        state: "failed",
        summary: "3/5",
        logUrl: "https://github.com/acme/platform/actions/runs/9812034",
        satellites: [],
      },
      { id: "review", state: "pending", satellites: [] },
      { id: "merge", state: "pending", satellites: [] },
      { id: "deploy", state: "pending", satellites: [] },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // 2. review_requested — Frontend team, my turn to review Priya's component PR
  {
    id: "flow-02",
    title: "feat: virtualized table for large dataset rendering",
    branch: "feat/virtualized-table",
    headSha: "b2d9e4f",
    repo: "acme/web-app",
    updatedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    needsAttention: [
      {
        reason: "review_requested",
        stage: "review",
        url: "https://github.com/acme/web-app/pull/88",
      },
    ],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/web-app/pull/88",
        satellites: [
          {
            id: "sat-02-agent",
            kind: "agent",
            label: "cursor-ai",
            focus: "building windowed row rendering with react-virtual",
            status: "passed",
            url: "https://github.com/acme/web-app/pull/88",
          },
          {
            id: "sat-02-sub-a",
            kind: "subagent",
            label: "Accessibility Auditor",
            focus: "aria-grid and keyboard nav compliance",
            status: "passed",
            parentId: "sat-02-agent",
            url: "https://github.com/acme/web-app/pull/88",
          },
        ],
      },
      {
        id: "pr",
        state: "done",
        summary: "#88",
        url: "https://github.com/acme/web-app/pull/88",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "6/6",
        satellites: [],
      },
      {
        id: "review",
        state: "active",
        summary: "you",
        url: "https://github.com/acme/web-app/pull/88",
        satellites: [
          {
            id: "sat-02-ai-review",
            kind: "ai_review",
            label: "Copilot Review",
            status: "passed",
            url: "https://github.com/acme/web-app/pull/88#pullrequestreview-7741",
          },
        ],
      },
      { id: "merge", state: "pending", satellites: [] },
      { id: "deploy", state: "pending", satellites: [] },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // 3. changes_requested — Data/ML team, reviewer pushed back on schema migration
  {
    id: "flow-03",
    title: "feat: add feature-store schema v2 with backfill migration",
    branch: "feat/feature-store-schema-v2",
    headSha: "c71b3a9",
    repo: "acme/data-pipeline",
    updatedAt: new Date(Date.now() - 47 * 60000).toISOString(),
    needsAttention: [
      {
        reason: "changes_requested",
        stage: "review",
        url: "https://github.com/acme/data-pipeline/pull/134",
      },
    ],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/data-pipeline/pull/134",
        satellites: [
          {
            id: "sat-03-agent",
            kind: "agent",
            label: "claude-dev",
            focus: "designing partitioned schema with zero-downtime migration path",
            status: "passed",
            url: "https://github.com/acme/data-pipeline/pull/134",
          },
          {
            id: "sat-03-sub-a",
            kind: "subagent",
            label: "Schema Validator",
            focus: "validating Avro compatibility across versions",
            status: "passed",
            parentId: "sat-03-agent",
            url: "https://github.com/acme/data-pipeline/pull/134",
          },
          {
            id: "sat-03-sub-b",
            kind: "subagent",
            label: "Migration Planner",
            focus: "generating backfill job and rollback script",
            status: "passed",
            parentId: "sat-03-agent",
            url: "https://github.com/acme/data-pipeline/pull/134",
          },
        ],
      },
      {
        id: "pr",
        state: "done",
        summary: "#134",
        url: "https://github.com/acme/data-pipeline/pull/134",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "4/4",
        satellites: [],
      },
      {
        id: "review",
        state: "failed",
        summary: "changes",
        url: "https://github.com/acme/data-pipeline/pull/134",
        satellites: [
          {
            id: "sat-03-ai-review",
            kind: "ai_review",
            label: "Copilot Review",
            status: "passed",
            url: "https://github.com/acme/data-pipeline/pull/134#pullrequestreview-8812",
          },
        ],
      },
      { id: "merge", state: "pending", satellites: [] },
      { id: "deploy", state: "pending", satellites: [] },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // 4. deploy_waiting_approval — DevOps, staging gate awaiting manual sign-off
  {
    id: "flow-04",
    title: "chore: rotate secrets manager ARNs and update IAM policies",
    branch: "chore/rotate-secrets-iam",
    headSha: "d40e8b1",
    mergeCommitSha: "e5f2c3a",
    repo: "acme/infra",
    updatedAt: new Date(Date.now() - 1.5 * 60 * 60000).toISOString(),
    needsAttention: [
      {
        reason: "deploy_waiting_approval",
        stage: "deploy",
        url: "https://github.com/acme/infra/deployments/staging",
      },
    ],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/infra/pull/56",
        satellites: [],
      },
      {
        id: "pr",
        state: "done",
        summary: "#56",
        url: "https://github.com/acme/infra/pull/56",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "3/3",
        satellites: [],
      },
      {
        id: "review",
        state: "done",
        summary: "approved",
        url: "https://github.com/acme/infra/pull/56",
        satellites: [],
      },
      {
        id: "merge",
        state: "done",
        summary: "merged",
        satellites: [],
      },
      {
        id: "deploy",
        state: "active",
        summary: "waiting",
        url: "https://github.com/acme/infra/deployments/staging",
        satellites: [
          {
            id: "sat-04-env-staging",
            kind: "environment",
            label: "staging",
            status: "waiting",
            url: "https://github.com/acme/infra/deployments/staging",
          },
          {
            id: "sat-04-env-canary",
            kind: "environment",
            label: "canary",
            status: "waiting",
            url: "https://github.com/acme/infra/deployments/canary",
          },
        ],
      },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // 5. deploy_failed — Security team, prod deploy blew up — incident!
  {
    id: "flow-05",
    title: "fix: patch CVE-2025-44812 in JWT validation logic",
    branch: "fix/cve-2025-44812-jwt",
    headSha: "f93c7d2",
    mergeCommitSha: "a0b1c2d",
    repo: "acme/platform",
    updatedAt: new Date(Date.now() - 22 * 60000).toISOString(),
    needsAttention: [
      {
        reason: "deploy_failed",
        stage: "deploy",
        url: "https://github.com/acme/platform/deployments/activity_log",
      },
    ],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/platform/pull/220",
        satellites: [],
      },
      {
        id: "pr",
        state: "done",
        summary: "#220",
        url: "https://github.com/acme/platform/pull/220",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "5/5",
        satellites: [],
      },
      {
        id: "review",
        state: "done",
        summary: "approved",
        url: "https://github.com/acme/platform/pull/220",
        satellites: [],
      },
      {
        id: "merge",
        state: "done",
        summary: "merged",
        satellites: [],
      },
      {
        id: "deploy",
        state: "failed",
        summary: "failed",
        logUrl:
          "https://github.com/acme/platform/deployments/activity_log",
        satellites: [
          {
            id: "sat-05-env-staging",
            kind: "environment",
            label: "staging",
            status: "passed",
            url: "https://github.com/acme/platform/deployments/staging",
          },
          {
            id: "sat-05-env-prod",
            kind: "environment",
            label: "prod",
            status: "failed",
            url: "https://github.com/acme/platform/deployments/activity_log",
          },
        ],
      },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // 6. merge_conflict — Platform team, alice's refactor hit a dirty rebase
  {
    id: "flow-06",
    title: "refactor: consolidate auth middleware into shared package",
    branch: "refactor/consolidate-auth-middleware",
    headSha: "9e4d5f0",
    repo: "acme/platform",
    updatedAt: new Date(Date.now() - 2.3 * 60 * 60000).toISOString(),
    needsAttention: [
      {
        reason: "merge_conflict",
        stage: "merge",
        url: "https://github.com/acme/platform/pull/215",
      },
    ],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/platform/pull/215",
        satellites: [],
      },
      {
        id: "pr",
        state: "done",
        summary: "#215",
        url: "https://github.com/acme/platform/pull/215",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "4/4",
        satellites: [],
      },
      {
        id: "review",
        state: "done",
        summary: "approved",
        url: "https://github.com/acme/platform/pull/215",
        satellites: [],
      },
      {
        id: "merge",
        state: "failed",
        summary: "conflict",
        url: "https://github.com/acme/platform/pull/215",
        satellites: [],
      },
      { id: "deploy", state: "pending", satellites: [] },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // 7. check_failed — Data/ML pipeline, nightly integration test exploded
  {
    id: "flow-07",
    title: "feat: streaming inference endpoint for real-time model scoring",
    branch: "feat/streaming-inference-endpoint",
    headSha: "1c2d3e4",
    repo: "acme/data-pipeline",
    updatedAt: new Date(Date.now() - 9 * 60000).toISOString(),
    needsAttention: [
      {
        reason: "check_failed",
        stage: "checks",
        url: "https://github.com/acme/data-pipeline/actions/runs/7743021",
      },
    ],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/data-pipeline/pull/138",
        satellites: [
          {
            id: "sat-07-agent",
            kind: "agent",
            label: "claude-dev",
            focus: "wiring FastAPI SSE endpoint to model serving layer",
            status: "passed",
            url: "https://github.com/acme/data-pipeline/pull/138",
          },
        ],
      },
      {
        id: "pr",
        state: "done",
        summary: "#138",
        url: "https://github.com/acme/data-pipeline/pull/138",
        satellites: [],
      },
      {
        id: "checks",
        state: "failed",
        summary: "2/4",
        logUrl:
          "https://github.com/acme/data-pipeline/actions/runs/7743021",
        satellites: [],
      },
      { id: "review", state: "pending", satellites: [] },
      { id: "merge", state: "pending", satellites: [] },
      { id: "deploy", state: "pending", satellites: [] },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // 8. review_requested — Infra, carlos opened a Terraform modules PR needing review
  {
    id: "flow-08",
    title: "feat: modularize Terraform VPC and EKS cluster definitions",
    branch: "feat/terraform-vpc-eks-modules",
    headSha: "5a6b7c8",
    repo: "acme/infra",
    updatedAt: new Date(Date.now() - 3.1 * 60 * 60000).toISOString(),
    needsAttention: [
      {
        reason: "review_requested",
        stage: "review",
        url: "https://github.com/acme/infra/pull/61",
      },
    ],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/infra/pull/61",
        satellites: [],
      },
      {
        id: "pr",
        state: "done",
        summary: "#61",
        url: "https://github.com/acme/infra/pull/61",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "2/2",
        satellites: [],
      },
      {
        id: "review",
        state: "active",
        summary: "you",
        url: "https://github.com/acme/infra/pull/61",
        satellites: [],
      },
      { id: "merge", state: "pending", satellites: [] },
      { id: "deploy", state: "pending", satellites: [] },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // ─── CALM FLOWS ────────────────────────────────────────────────────────────

  // 9. Early-stage agent run — Frontend, cursor-ai still coding, no PR yet
  {
    id: "flow-09",
    title: "feat: interactive onboarding tour for new users",
    branch: "feat/onboarding-tour",
    repo: "acme/web-app",
    updatedAt: new Date(Date.now() - 11 * 60000).toISOString(),
    needsAttention: [],
    stages: [
      {
        id: "work",
        state: "active",
        summary: "coding",
        satellites: [
          {
            id: "sat-09-agent",
            kind: "agent",
            label: "cursor-ai",
            focus: "scaffolding multi-step tour with shepherd.js integration",
            status: "running",
            url: "https://github.com/acme/web-app/pulls",
          },
          {
            id: "sat-09-sub-a",
            kind: "subagent",
            label: "Copy Writer",
            focus: "drafting tooltip text for each tour step",
            status: "running",
            parentId: "sat-09-agent",
            url: "https://github.com/acme/web-app/pulls",
          },
          {
            id: "sat-09-sub-b",
            kind: "subagent",
            label: "Asset Generator",
            focus: "producing SVG illustrations for tour cards",
            status: "waiting",
            parentId: "sat-09-agent",
            url: "https://github.com/acme/web-app/pulls",
          },
          {
            id: "sat-09-sub-c",
            kind: "subagent",
            label: "A/B Config",
            focus: "wiring feature-flag variants into tour trigger logic",
            status: "waiting",
            parentId: "sat-09-agent",
            url: "https://github.com/acme/web-app/pulls",
          },
        ],
      },
      { id: "pr", state: "no_data", satellites: [] },
      { id: "checks", state: "no_data", satellites: [] },
      { id: "review", state: "no_data", satellites: [] },
      { id: "merge", state: "no_data", satellites: [] },
      { id: "deploy", state: "no_data", satellites: [] },
      { id: "prod", state: "no_data", satellites: [] },
    ],
  },

  // 10. AI review in-flight — Platform, copilot bot reviewing right now
  {
    id: "flow-10",
    title: "perf: cache compiled route handlers in memory between requests",
    branch: "perf/cache-route-handlers",
    headSha: "7e8f9a0",
    repo: "acme/platform",
    updatedAt: new Date(Date.now() - 35 * 60000).toISOString(),
    needsAttention: [],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/platform/pull/218",
        satellites: [
          {
            id: "sat-10-agent",
            kind: "agent",
            label: "github-copilot[bot]",
            focus: "profiling hot paths and adding LRU handler cache",
            status: "passed",
            url: "https://github.com/acme/platform/pull/218",
          },
        ],
      },
      {
        id: "pr",
        state: "done",
        summary: "#218",
        url: "https://github.com/acme/platform/pull/218",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "5/5",
        satellites: [],
      },
      {
        id: "review",
        state: "active",
        summary: "reviewing",
        url: "https://github.com/acme/platform/pull/218",
        satellites: [
          {
            id: "sat-10-ai-review",
            kind: "ai_review",
            label: "Copilot Review",
            status: "running",
            url: "https://github.com/acme/platform/pull/218#pullrequestreview-9021",
          },
        ],
      },
      { id: "merge", state: "pending", satellites: [] },
      { id: "deploy", state: "pending", satellites: [] },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },

  // 11. Fully done — merged, deployed to prod, totally live and quiet
  {
    id: "flow-11",
    title: "fix: resolve null pointer in user preferences loader",
    branch: "fix/user-prefs-null-pointer",
    headSha: "b3c4d5e",
    mergeCommitSha: "f6a7b8c",
    repo: "acme/web-app",
    updatedAt: new Date(Date.now() - 5.5 * 60 * 60000).toISOString(),
    needsAttention: [],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/web-app/pull/85",
        satellites: [
          {
            id: "sat-11-agent",
            kind: "agent",
            label: "cursor-ai",
            focus: "adding optional-chaining guard and unit tests",
            status: "passed",
            url: "https://github.com/acme/web-app/pull/85",
          },
        ],
      },
      {
        id: "pr",
        state: "done",
        summary: "#85",
        url: "https://github.com/acme/web-app/pull/85",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "6/6",
        satellites: [],
      },
      {
        id: "review",
        state: "done",
        summary: "approved",
        url: "https://github.com/acme/web-app/pull/85",
        satellites: [
          {
            id: "sat-11-ai-review",
            kind: "ai_review",
            label: "Copilot Review",
            status: "passed",
            url: "https://github.com/acme/web-app/pull/85#pullrequestreview-6630",
          },
        ],
      },
      {
        id: "merge",
        state: "done",
        summary: "merged",
        url: "https://github.com/acme/web-app/pull/85",
        satellites: [],
      },
      {
        id: "deploy",
        state: "done",
        summary: "success",
        url: "https://github.com/acme/web-app/deployments/staging",
        satellites: [
          {
            id: "sat-11-env-staging",
            kind: "environment",
            label: "staging",
            status: "passed",
            url: "https://github.com/acme/web-app/deployments/staging",
          },
        ],
      },
      {
        id: "prod",
        state: "done",
        summary: "live",
        url: "https://github.com/acme/web-app/deployments/production",
        satellites: [
          {
            id: "sat-11-env-prod",
            kind: "environment",
            label: "prod",
            status: "passed",
            url: "https://github.com/acme/web-app/deployments/production",
          },
        ],
      },
    ],
  },

  // 12. Fully done — large infra change shipped cleanly
  {
    id: "flow-12",
    title: "chore: upgrade Kubernetes node pools to 1.30 and apply PodDisruptionBudgets",
    branch: "chore/k8s-1.30-pdb",
    headSha: "d9e0f1a",
    mergeCommitSha: "2b3c4d5",
    repo: "acme/infra",
    updatedAt: new Date(Date.now() - 11 * 60 * 60000).toISOString(),
    needsAttention: [],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/infra/pull/58",
        satellites: [],
      },
      {
        id: "pr",
        state: "done",
        summary: "#58",
        url: "https://github.com/acme/infra/pull/58",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "3/3",
        satellites: [],
      },
      {
        id: "review",
        state: "done",
        summary: "approved",
        url: "https://github.com/acme/infra/pull/58",
        satellites: [],
      },
      {
        id: "merge",
        state: "done",
        summary: "merged",
        satellites: [],
      },
      {
        id: "deploy",
        state: "done",
        summary: "success",
        url: "https://github.com/acme/infra/deployments/staging",
        satellites: [
          {
            id: "sat-12-env-staging",
            kind: "environment",
            label: "staging",
            status: "passed",
            url: "https://github.com/acme/infra/deployments/staging",
          },
          {
            id: "sat-12-env-canary",
            kind: "environment",
            label: "canary",
            status: "passed",
            url: "https://github.com/acme/infra/deployments/canary",
          },
        ],
      },
      {
        id: "prod",
        state: "done",
        summary: "live",
        url: "https://github.com/acme/infra/deployments/production",
        satellites: [
          {
            id: "sat-12-env-prod",
            kind: "environment",
            label: "prod",
            status: "passed",
            url: "https://github.com/acme/infra/deployments/production",
          },
        ],
      },
    ],
  },

  // 13. Calm, mid-pipeline — Data/ML PR approved, checks green, merge imminent
  {
    id: "flow-13",
    title: "perf: vectorize embedding lookup with FAISS index partitioning",
    branch: "perf/faiss-index-partitioning",
    headSha: "6f7a8b9",
    repo: "acme/data-pipeline",
    updatedAt: new Date(Date.now() - 4.2 * 60 * 60000).toISOString(),
    needsAttention: [],
    stages: [
      {
        id: "work",
        state: "done",
        summary: "authored",
        url: "https://github.com/acme/data-pipeline/pull/136",
        satellites: [
          {
            id: "sat-13-agent",
            kind: "agent",
            label: "claude-dev",
            focus: "benchmarking partition strategies across 100M vector corpus",
            status: "passed",
            url: "https://github.com/acme/data-pipeline/pull/136",
          },
          {
            id: "sat-13-sub-a",
            kind: "subagent",
            label: "Benchmark Runner",
            focus: "collecting p50/p95/p99 latency across shard counts",
            status: "passed",
            parentId: "sat-13-agent",
            url: "https://github.com/acme/data-pipeline/pull/136",
          },
        ],
      },
      {
        id: "pr",
        state: "done",
        summary: "#136",
        url: "https://github.com/acme/data-pipeline/pull/136",
        satellites: [],
      },
      {
        id: "checks",
        state: "done",
        summary: "4/4",
        satellites: [],
      },
      {
        id: "review",
        state: "done",
        summary: "approved",
        url: "https://github.com/acme/data-pipeline/pull/136",
        satellites: [
          {
            id: "sat-13-ai-review",
            kind: "ai_review",
            label: "Copilot Review",
            status: "passed",
            url: "https://github.com/acme/data-pipeline/pull/136#pullrequestreview-8801",
          },
        ],
      },
      {
        id: "merge",
        state: "active",
        summary: "ready",
        url: "https://github.com/acme/data-pipeline/pull/136",
        satellites: [],
      },
      { id: "deploy", state: "pending", satellites: [] },
      { id: "prod", state: "pending", satellites: [] },
    ],
  },
];
