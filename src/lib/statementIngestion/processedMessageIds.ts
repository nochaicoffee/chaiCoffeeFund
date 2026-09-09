import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

export interface ProcessedMessageIdsStore {
  ids: string[];
}

const EMPTY_STORE: ProcessedMessageIdsStore = { ids: [] };

export function isProcessed(store: ProcessedMessageIdsStore, messageId: string): boolean {
  return store.ids.includes(messageId);
}

/** Pure: returns a new store with `messageId` added, or the same store if it's already present. */
export function markProcessed(store: ProcessedMessageIdsStore, messageId: string): ProcessedMessageIdsStore {
  if (isProcessed(store, messageId)) return store;
  return { ids: [...store.ids, messageId] };
}

export async function loadProcessedMessageIds(path: string): Promise<ProcessedMessageIdsStore> {
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as ProcessedMessageIdsStore;
    return Array.isArray(parsed.ids) ? parsed : EMPTY_STORE;
  } catch {
    return EMPTY_STORE;
  }
}

export async function saveProcessedMessageIds(path: string, store: ProcessedMessageIdsStore): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store, null, 2));
}
