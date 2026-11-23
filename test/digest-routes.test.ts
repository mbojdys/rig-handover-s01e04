import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let dir: string;
let app: ReturnType<typeof createApp>;

const line = (job: string, status: string, owner: string | null = 'rook') =>
  JSON.stringify({ at: '2026-10-29T01:00:00+01:00', job, status, owner });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(dir, '2026-01-01.jsonl'), [line('b/job', 'ok'), line('a/job', 'fail', null)].join('\n') + '\n');
  writeFileSync(join(dir, '2026-01-02.jsonl'), '');
  writeFileSync(join(dir, '2026-01-03.jsonl'), [line('a/job', 'ok'), '{"at":"2026-01-03T0'].join('\n'));
  app = createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('digest routes', () => {
  it('renders the page and the JSON with the same jobs in the same order', async () => {
    const page = await app.request('/digest/2026-01-01');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('—');

    const api = await app.request('/api/digest/2026-01-01');
    const body = (await api.json()) as { rows: { job: string; owner: string | null }[] };
    expect(api.status).toBe(200);
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    expect(body.rows[0]?.owner).toBeNull();
  });

  it('404s for a night with no file', async () => {
    expect((await app.request('/digest/2026-02-02')).status).toBe(404);
    expect((await app.request('/api/digest/2026-02-02')).status).toBe(404);
  });

  it('says nothing ran for an empty night', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
    expect(((await (await app.request('/api/digest/2026-01-02')).json()) as { rows: unknown[] }).rows).toEqual([]);
  });

  it('counts a bad line and still renders the night', async () => {
    const res = await app.request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('1 unreadable line(s) skipped');
    const body = (await (await app.request('/api/digest/2026-01-03')).json()) as { badLines: number };
    expect(body.badLines).toBe(1);
  });

  it('links every night on the status board to its digest with counts', async () => {
    const html = await (await app.request('/')).text();
    expect(html).toContain('href="/digest/2026-01-01"');
    expect(html).toContain('ok 1 · retry 0 · fail 1');
  });
});
