import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunStatus } from './types.js';

type Entry = { at: string; job: string; status: RunStatus; owner: string | null; error: string | null };

const statuses: readonly string[] = ['ok', 'retry', 'fail'];

function parseLine(line: string): Entry | null {
  try {
    const v: unknown = JSON.parse(line);
    if (typeof v !== 'object' || v === null) return null;
    const o = v as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
    if (typeof o.status !== 'string' || !statuses.includes(o.status)) return null;
    return {
      at: o.at,
      job: o.job,
      status: o.status as RunStatus,
      owner: typeof o.owner === 'string' ? o.owner : null,
      error: typeof o.error === 'string' ? o.error : null,
    };
  } catch {
    return null;
  }
}

export const isNight = (night: string) => /^\d{4}-\d{2}-\d{2}$/.test(night);

export const readNight: ReadNight = (runsDir, night) => {
  if (!isNight(night)) return null;
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) return null;

  const jobs = new Map<string, DigestRow>();
  const counts: Night['counts'] = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const e = parseLine(line);
    if (!e) {
      badLines++;
      continue;
    }
    counts[e.status]++;
    const row = jobs.get(e.job);
    if (!row) {
      jobs.set(e.job, {
        job: e.job,
        owner: e.owner,
        runs: 1,
        retries: e.status === 'retry' ? 1 : 0,
        lastStatus: e.status,
        lastError: e.error,
        firstAt: e.at,
        lastAt: e.at,
      });
      continue;
    }
    row.runs++;
    if (e.status === 'retry') row.retries++;
    row.owner = e.owner ?? row.owner;
    row.lastStatus = e.status;
    row.lastError = e.error;
    row.lastAt = e.at;
  }

  const rows = [...jobs.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines, counts };
};
