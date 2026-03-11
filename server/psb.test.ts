import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("PSB Router — getNationalSummary", () => {
  it("returns national summary with numeric fields", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.psb.getNationalSummary();
    expect(result).toBeDefined();
    expect(typeof result.mayors).toBe("number");
    expect(typeof result.councilors).toBe("number");
    expect(typeof result.federalDeputies).toBe("number");
    expect(result.mayors).toBeGreaterThan(0);
    expect(result.councilors).toBeGreaterThan(0);
  }, 20000);
});

describe("PSB Router — getStateRanking", () => {
  it("returns state ranking with top states", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.psb.getStateRanking({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("uf");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("mayors");
    expect(result[0]).toHaveProperty("councilors");
  }, 20000);
});

describe("PSB Router — getStateQuadro", () => {
  it("returns state quadro for PE", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.psb.getStateQuadro({ uf: "PE" });
    expect(result).toBeDefined();
    expect(result.uf).toBe("PE");
    expect(result.name).toBe("Pernambuco");
    expect(typeof result.mayors).toBe("number");
    expect(typeof result.councilors).toBe("number");
  }, 20000);
});

describe("PSB Router — getStateElected", () => {
  it("returns elected list for PE PREFEITO", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.psb.getStateElected({ uf: "PE", cargo: "PREFEITO", page: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  }, 20000);
});

describe("PSB Router — getStateDirectory", () => {
  it("returns directory for PE", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.psb.getStateDirectory({ uf: "PE" });
    expect(result).toBeDefined();
    expect(result.uf).toBe("PE");
    expect(result.name).toBe("Pernambuco");
    expect(typeof result.president).toBe("string");
  }, 5000);
});

describe("PSB Router — getStateHistory", () => {
  it("returns history for CE", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.psb.getStateHistory({ uf: "CE" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("year");
    expect(result[0]).toHaveProperty("total");
  }, 20000);
});
