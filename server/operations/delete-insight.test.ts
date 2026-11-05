import { expect } from "@std/expect";
import { beforeAll, describe, it } from "@std/testing/bdd";
import { withDB } from "../testing.ts";
import deleteInsight from "./delete-insight.ts";

describe("deleting an insight", () => {
  withDB((fixture) => {
    let deleted: boolean;
    let missing: boolean;

    beforeAll(() => {
      const createdAt = new Date().toISOString();
      fixture.insights.insert([
        { brand: 1, createdAt, text: "keep" },
        { brand: 2, createdAt, text: "remove" },
        { brand: 3, createdAt, text: "keep too" },
      ]);
      deleted = deleteInsight({ ...fixture, id: 2 });
      missing = deleteInsight({ ...fixture, id: 2 });
    });

    it("reports that a row was deleted", () => {
      expect(deleted).toBe(true);
    });

    it("deletes only that row", () => {
      expect(fixture.insights.selectAll().map((row) => row.id)).toEqual([1, 3]);
    });

    it("reports nothing deleted for an unknown id", () => {
      expect(missing).toBe(false);
    });
  });
});
