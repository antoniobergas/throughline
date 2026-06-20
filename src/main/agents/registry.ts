import { claudeCodeProvider } from "./claude-code";
import { aiderProvider } from "./aider";
import { copilotProvider } from "./copilot";
import type { AgentProvider } from "./types";
import type { AgentProviderInfo } from "../../shared/types";

export const PROVIDERS: AgentProvider[] = [
  claudeCodeProvider,
  aiderProvider,
  copilotProvider,
];

export async function getProviderInfos(token?: string): Promise<AgentProviderInfo[]> {
  return Promise.all(
    PROVIDERS.map(async (p) => {
      let available = false;
      try {
        if (p.kind === "local") {
          available = await p.checkAvailable();
        } else {
          available = token ? await p.checkAvailable(token) : false;
        }
      } catch {
        available = false;
      }
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        kind: p.kind,
        available,
      } satisfies AgentProviderInfo;
    }),
  );
}

export function getProvider(id: string): AgentProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
