import { expect } from "@std/expect";
import { beforeAll, describe, it } from "@std/testing/bdd";
import type { Insight } from "../../lib/insight.ts";
import { withDB } from "../testing.ts";
import createInsight from "./create-insight.ts";
import listInsights from "./list-insights.ts";

describe("creating an insight", () => {
  withDB((fixture) => {
    let result: Insight;

    beforeAll(() => {
      fixture.insights.insert([
        {
          brand: 1,
          createdAt: new Date().toISOString(),
          text: "Men's existing",
        },
      ]);
      result = createInsight({ ...fixture, brand: 3, text: "new" });
    });

    it("returns the created insight with its new id", () => {
      expect(result).toEqual({
        id: 2,
        brand: 3,
        createdAt: expect.any(Date),
        text: "new",
      });
    });

    it("stores the insight in the DB", () => {
      expect(listInsights(fixture)).toContainEqual(result);
    });

    it("#9 stores text with quotes exactly as written", () => {
      const text = `Men's suits; it's "fine"'); DROP TABLE insights; --`;
      const created = createInsight({ ...fixture, brand: 1, text });
      expect(listInsights(fixture)).toContainEqual(created);
      expect(created.text).toBe(text);
    });
  });
});
