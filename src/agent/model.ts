import type { Model } from '@earendil-works/pi-ai';
import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { env } from '../lib/env.js';

/**
 * Model resolution for the agents.
 *
 * The models Daneel runs on come from the exe.dev LLM integration, which is
 * wired into pi by the `exe-dev` extension (~/.pi/agent/extensions/exe-dev).
 * That extension queues its providers via `pi.registerProvider()` during load;
 * pi's interactive runner flushes that queue automatically, but an SDK session
 * (which is what these cron agents are) does not — so we flush it ourselves
 * after `loader.reload()`, otherwise the registry only knows pi's built-in
 * models and every request goes straight to the upstream API with no key.
 *
 * Model ids are whatever the integration currently serves (they carry an
 * `@llm` suffix and do change over time), so we try a preference list and fall
 * back to any integration-provided model rather than hard-failing.
 */

type PendingProviderRegistration = { name: string; config: unknown };

type ResourceLoaderLike = {
  getExtensions(): {
    runtime?: { pendingProviderRegistrations?: PendingProviderRegistration[] };
  };
};

/** Preferred models, in order. Override with AGENT_MODEL="provider/model-id". */
const MODEL_CANDIDATES: Array<[provider: string, id: string]> = [
  ['anthropic', 'claude-sonnet-4-6@llm'],
  ['fireworks', 'accounts/fireworks/models/deepseek-v4-pro-0813@llm'],
  ['openai', 'gpt-5.5@llm'],
];

/** Apply provider registrations queued by extensions to the model registry. */
export function applyExtensionProviders(loader: ResourceLoaderLike, modelRegistry: ModelRegistry): void {
  const pending = loader.getExtensions()?.runtime?.pendingProviderRegistrations;
  if (!pending || pending.length === 0) return;

  for (const { name, config } of pending) {
    try {
      modelRegistry.registerProvider(name, config as never);
    } catch (err) {
      console.warn(`[agent-model] failed to register provider "${name}":`, err instanceof Error ? err.message : err);
    }
  }
  pending.length = 0;
}

/**
 * Resolve the model the agent should run on. Must be called *after*
 * `loader.reload()`. Throws if nothing usable is available.
 */
export function resolveAgentModel(loader: ResourceLoaderLike, modelRegistry: ModelRegistry): Model {
  applyExtensionProviders(loader, modelRegistry);

  const candidates = env.AGENT_MODEL
    ? [splitModelRef(env.AGENT_MODEL)].filter((c): c is [string, string] => c !== null)
    : MODEL_CANDIDATES;

  for (const [provider, id] of candidates) {
    const model = modelRegistry.find(provider, id);
    if (model) return model;
  }

  // Last resort: any model the integration provides (ids are suffixed `@llm`).
  const managed = modelRegistry.getAll().filter((m) => m.id.endsWith('@llm'));
  if (managed.length > 0) {
    console.warn(
      `[agent-model] none of [${candidates.map(([p, i]) => `${p}/${i}`).join(', ')}] available — falling back to ${managed[0].provider}/${managed[0].id}`
    );
    return managed[0];
  }

  throw new Error(
    `No agent model available. Tried: ${candidates.map(([p, i]) => `${p}/${i}`).join(', ')}. ` +
      'Is the exe.dev LLM integration reachable and the exe-dev extension loaded?'
  );
}

function splitModelRef(ref: string): [string, string] | null {
  const idx = ref.indexOf('/');
  if (idx <= 0 || idx === ref.length - 1) return null;
  return [ref.slice(0, idx), ref.slice(idx + 1)];
}
