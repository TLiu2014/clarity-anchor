import type { Message } from "@strands-agents/sdk";

/**
 * Process-local conversation history so a chat can CONTINUE across requests:
 * each turn seeds the Strands agent with the prior messages and saves the
 * updated history back, keyed by conversationId.
 *
 * Backed on globalThis (Next bundles routes separately) — single-instance only.
 * A multi-instance deploy would use a shared store (Redis, DB, or the SDK's
 * SessionManager).
 */
const g = globalThis as unknown as { __convoHistory?: Map<string, Message[]> };
const store: Map<string, Message[]> =
  g.__convoHistory ?? (g.__convoHistory = new Map());

export function getHistory(conversationId: string | undefined): Message[] {
  if (!conversationId) return [];
  return store.get(conversationId) ?? [];
}

export function saveHistory(
  conversationId: string | undefined,
  messages: Message[]
): void {
  if (!conversationId) return;
  store.set(conversationId, messages);
}

export function clearHistory(conversationId: string | undefined): void {
  if (!conversationId) return;
  store.delete(conversationId);
}
