import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Local conversation cache (per phone)
type CachedMessage = { role: 'user' | 'assistant'; content: string; timestamp: number };
type ConversationCache = {
  conversationId?: string;
  messages: CachedMessage[];
  updatedAt: number; // epoch ms
};

const MAX_MESSAGES = 20;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function keyFor(phone: string) {
  const normalized = (phone || '').replace(/\D+/g, '');
  return `chat_cache_${normalized}`;
}

export function loadConversationCache(phone: string): ConversationCache | null {
  try {
    const raw = localStorage.getItem(keyFor(phone));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConversationCache;
    if (!parsed?.updatedAt) return null;
    if (Date.now() - parsed.updatedAt > TTL_MS) {
      localStorage.removeItem(keyFor(phone));
      return null;
    }
    // Trim to last MAX_MESSAGES
    parsed.messages = (parsed.messages || []).slice(-MAX_MESSAGES);
    return parsed;
  } catch {
    return null;
  }
}

export function saveConversationCache(phone: string, cache: ConversationCache) {
  try {
    const trimmed: ConversationCache = {
      conversationId: cache.conversationId,
      messages: (cache.messages || []).slice(-MAX_MESSAGES),
      updatedAt: Date.now(),
    };
    localStorage.setItem(keyFor(phone), JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

export function clearConversationCache(phone: string) {
  try { localStorage.removeItem(keyFor(phone)); } catch {}
}
