import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CRON, stubHostedEnv } from "@/lib/auth/google.testutil";

vi.mock("server-only", () => ({}));
const cards = vi.fn();
const accounts = vi.fn();
vi.mock("@/app/api/statements/sync/route", () => ({ POST: (request: Request) => cards(request) }));
vi.mock("@/app/api/account-statements/sync/route", () => ({ POST: (request: Request) => accounts(request) }));

const { GET } = await import("./route");

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const call = (headers: Record<string, string> = { authorization: `Bearer ${CRON}` }) => GET(new Request("https://app.example/api/cron/sync", { headers }));

beforeEach(() => {
  stubHostedEnv((name, value) => vi.stubEnv(name, value));
  cards.mockReset().mockResolvedValue(json({ status: "done", outcomes: [], remaining: 0 }));
  accounts.mockReset().mockResolvedValue(json({ status: "done", outcomes: [], remaining: 0, dryRun: false }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/cron/sync", () => {
  it("refuses a call without the cron secret, and runs nothing", async () => {
    const bad: Record<string, string>[] = [{}, { authorization: "Bearer wrong" }, { authorization: `Basic ${CRON}` }];
    for (const headers of bad) {
      expect((await call(headers)).status).toBe(401);
    }
    expect(cards).not.toHaveBeenCalled();
    expect(accounts).not.toHaveBeenCalled();
  });

  it("runs the card sync and then the account sync as a scheduled run, and reports counts", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cards: { ok: true, status: "done", remaining: 0, rounds: 1 },
      accounts: { ok: true, status: "done", remaining: 0, rounds: 1 },
    });
    for (const [mock, path] of [[cards, "/api/statements/sync"], [accounts, "/api/account-statements/sync"]] as const) {
      const request = mock.mock.calls[0][0] as Request;
      expect(request.method).toBe("POST");
      expect(new URL(request.url).pathname).toBe(path);
      expect(await request.json()).toEqual({ trigger: "Scheduled" });
    }
  });

  it("goes on with another round while emails are left", async () => {
    cards.mockResolvedValueOnce(json({ status: "done", outcomes: [], remaining: 4 })).mockResolvedValueOnce(json({ status: "done", outcomes: [], remaining: 0 }));
    const body = await (await call()).json();
    expect(body.cards).toMatchObject({ remaining: 0, rounds: 2 });
    expect(cards).toHaveBeenCalledTimes(2);
  });

  it("is a 500 when a sync fails, but still runs the other one", async () => {
    cards.mockResolvedValue(json({ error: "Sheets quota" }, 429));
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ cards: { ok: false, rounds: 1 }, accounts: { ok: true } });
    expect(accounts).toHaveBeenCalledTimes(1);
  });

  it("is a 500 when a sync throws, and says nothing of why", async () => {
    cards.mockRejectedValue(new Error("secret detail"));
    const res = await call();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret detail");
    expect(accounts).toHaveBeenCalledTimes(1);
  });

  /** The clock the route reads, moved forward by each card round. */
  function cardRoundsTake(ms: number) {
    let time = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => time);
    cards.mockImplementation(async () => {
      time += ms;
      return json({ status: "done", outcomes: [], remaining: 7 });
    });
  }

  it("stops starting card rounds after 100 s, but the account sync still runs inside the shared 200 s", async () => {
    cardRoundsTake(60_000); // rounds start at 0 and 60 s; at 120 s the card window is over
    const body = await (await call()).json();
    expect(body.cards).toMatchObject({ rounds: 2, remaining: 7 });
    expect(body.accounts).toMatchObject({ ok: true, status: "done", rounds: 1 });
  });

  it("shares one deadline: a card sync that used up the time leaves the account sync not started, and that isn't a failure", async () => {
    cardRoundsTake(250_000);
    const res = await call();
    const body = await res.json();
    expect(body.cards).toMatchObject({ rounds: 1 });
    expect(body.accounts).toEqual({ ok: true, status: "not-started", remaining: 0, rounds: 0 });
    expect(accounts).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("treats another sync already running as nothing to do, not a failure", async () => {
    cards.mockResolvedValue(json({ status: "already-running", runningSince: "2026-11-17T01:30:00Z" }));
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).cards).toMatchObject({ status: "already-running", rounds: 1 });
  });
});
