import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { BrandId, BRANDS } from "../lib/brands.ts";

describe("BrandId", () => {
  it("accepts every listed brand id", () => {
    for (const { id } of BRANDS) expect(BrandId.parse(id)).toBe(id);
  });

  it("#16 rejects ids that are not in the brand list", () => {
    for (const id of [0, 7, -1, 1.5]) {
      expect(BrandId.safeParse(id).success).toBe(false);
    }
  });
});

import { Insight } from "../lib/insight.ts";

describe("Insight", () => {
  it("#4 #5 parses the server's JSON, turning createdAt into a Date", () => {
    const createdAt = "2026-11-05T05:56:11.924Z";
    const result = Insight.parse({ id: 1, brand: 2, createdAt, text: "hi" });
    expect(result).toEqual({
      id: 1,
      brand: 2,
      createdAt: new Date(createdAt),
      text: "hi",
    });
  });

  it("#4 rejects the old client field names", () => {
    const old = { id: 1, brandId: 2, date: new Date(), text: "hi" };
    expect(Insight.safeParse(old).success).toBe(false);
  });
});
