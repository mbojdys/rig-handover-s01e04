export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Times keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
  // Log lines per status, not jobs.
  counts: Record<RunStatus, number>;
};

// Returns null when runs/<night>.jsonl does not exist. Unparseable lines are counted, never thrown.
export type ReadNight = (runsDir: string, night: string) => Night | null;
