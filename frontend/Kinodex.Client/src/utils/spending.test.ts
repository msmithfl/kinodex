import { describe, expect, it } from "vitest";
import { monthKey, movieSpend, tvSpend } from "./spending";
import { makeMovie, makePurchase, makeShow } from "../test/factories";

describe("spending", () => {
  it("puts a movie's price in the month of its purchase date", () => {
    expect(movieSpend([makeMovie({ purchasedAt: "2026-03-31", purchasePrice: 19.99 })])).toEqual([
      { month: "2026-03", amount: 19.99, kind: "movie" },
    ]);
  });

  it("counts a missing price as nothing", () => {
    // Older rows can come back without a price
    const movie = makeMovie({ purchasePrice: undefined as unknown as number });
    expect(movieSpend([movie])[0].amount).toBe(0);
  });

  it("gives each TV purchase its own month", () => {
    const show = makeShow({
      purchases: [
        makePurchase({ purchasedAt: "2025-12-24", price: 40 }),
        makePurchase({ purchasedAt: "2026-01-02", price: 15 }),
      ],
    });
    expect(tvSpend([show])).toEqual([
      { month: "2025-12", amount: 40, kind: "tv" },
      { month: "2026-01", amount: 15, kind: "tv" },
    ]);
  });

  it("names a date's month in local time", () => {
    // 1 January, 00:30 local: still January, whatever the time zone
    expect(monthKey(new Date(2026, 0, 1, 0, 30))).toBe("2026-01");
    expect(monthKey(new Date(2026, 11, 31, 23, 59))).toBe("2026-12");
  });
});
