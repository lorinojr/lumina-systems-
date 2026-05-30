import type { Product, Sale } from '../types';

const STORAGE_KEY = 'lumina_offline_queue';

export type OpType = 'upsert_product' | 'sync_stock' | 'record_sale';

export interface QueuedOperation {
  id: string;
  type: OpType;
  payload: any;
  timestamp: number;
  retries: number;
}

function load(): QueuedOperation[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}

function save(queue: QueuedOperation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueue(type: OpType, payload: any): void {
  const queue = load();
  queue.push({ id: crypto.randomUUID(), type, payload, timestamp: Date.now(), retries: 0 });
  save(queue);
}

export function queueSize(): number {
  return load().length;
}

export async function replayAll(
  executor: (op: QueuedOperation) => Promise<boolean>,
): Promise<number> {
  const queue = load();
  if (queue.length === 0) return 0;

  let replayed = 0;
  const remaining: QueuedOperation[] = [];

  for (const op of queue) {
    try {
      if (await executor(op)) { replayed++; }
      else {
        op.retries++;
        if (op.retries < 5) remaining.push(op);
      }
    } catch {
      op.retries++;
      if (op.retries < 5) remaining.push(op);
    }
  }

  save(remaining);
  return replayed;
}
