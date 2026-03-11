import { describe, it, expect } from "vitest";
import { queryTidb } from "./tidb";

describe("TiDB Connection", () => {
  it("should connect and query candidate_results table", async () => {
    const rows = await queryTidb<{ total: number }>(
      "SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND ano=2024 LIMIT 1"
    );
    expect(rows).toBeDefined();
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0].total)).toBeGreaterThan(0);
  }, 15000);
});
