import { Database } from "@db/sqlite";
import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { createApp } from "./app.ts";
import { withDB } from "./testing.ts";

const request = async (
  app: ReturnType<typeof createApp>,
  method: string,
  path: string,
) => {
  const res = await app.handle(
    new Request(`http://localhost${path}`, { method }),
  );
  if (!res) throw new Error(`no response for ${method} ${path}`);
  return res;
};

describe("insights API", () => {
  describe("#1 a fresh database", () => {
    const db = new Database(":memory:");
    const app = createApp(db);
    afterAll(() => db.close());

    it("lists [] instead of failing on a missing table", async () => {
      const res = await request(app, "GET", "/insights");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });
  });

  describe("populated database", () => {
    withDB((fixture) => {
      const app = createApp(fixture.db);
      const createdAt = new Date().toISOString();

      beforeAll(() => {
        fixture.insights.insert([
          { brand: 1, createdAt, text: "first" },
          { brand: 2, createdAt, text: "second" },
        ]);
      });

      it("#2 lists insights as JSON", async () => {
        const res = await request(app, "GET", "/insights");
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([
          { id: 1, brand: 1, createdAt, text: "first" },
          { id: 2, brand: 2, createdAt, text: "second" },
        ]);
      });

      it("looks up one insight as JSON", async () => {
        const res = await request(app, "GET", "/insights/2");
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
          id: 2,
          brand: 2,
          createdAt,
          text: "second",
        });
      });

      it("#8 returns 404 for an unknown id", async () => {
        const res = await request(app, "GET", "/insights/999");
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ error: "Insight not found" });
      });

      for (const id of ["abc", "0", "-1", "1.5"]) {
        it(`#8 returns 400 for invalid id "${id}"`, async () => {
          const res = await request(app, "GET", `/insights/${id}`);
          expect(res.status).toBe(400);
          expect(await res.json()).toHaveProperty("error");
        });
      }

      it("#6 #7 /insights/create is no longer a write endpoint", async () => {
        const res = await request(app, "GET", "/insights/create");
        expect(res.status).toBe(400);
        expect(fixture.insights.selectAll()).toHaveLength(2);
      });
    });
  });
});
