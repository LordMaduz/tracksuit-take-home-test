import { Database } from "@db/sqlite";
import { expect } from "@std/expect";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { createApp } from "./app.ts";
import { withDB } from "./testing.ts";

const request = async (
  app: ReturnType<typeof createApp>,
  method: string,
  path: string,
  body?: unknown,
) => {
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined
        ? undefined
        : typeof body === "string"
        ? body
        : JSON.stringify(body),
    }),
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

  describe("#12 POST /insights", () => {
    withDB((fixture) => {
      const app = createApp(fixture.db);

      it("returns 201 and the created insight", async () => {
        const res = await request(app, "POST", "/insights", {
          brand: 2,
          text: "  Suits are back  ",
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body).toEqual({
          id: 1,
          brand: 2,
          createdAt: expect.any(String),
          text: "Suits are back",
        });
        expect(fixture.insights.selectAll()).toHaveLength(1);
      });

      it("ignores a client-sent id and createdAt", async () => {
        const res = await request(app, "POST", "/insights", {
          id: 99,
          brand: 1,
          text: "mine",
          createdAt: "2000-01-01T00:00:00.000Z",
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.id).not.toBe(99);
        expect(Date.now() - Date.parse(body.createdAt)).toBeLessThan(60_000);
      });

      it("accepts text of exactly 1,000 characters", async () => {
        const res = await request(app, "POST", "/insights", {
          brand: 1,
          text: "a".repeat(1000),
        });
        expect(res.status).toBe(201);
      });

      const invalid: [string, unknown][] = [
        ["an unknown brand", { brand: 99, text: "hi" }],
        ["a missing brand", { text: "hi" }],
        ["empty text", { brand: 1, text: "" }],
        ["whitespace-only text", { brand: 1, text: "   " }],
        ["text over 1,000 characters", { brand: 1, text: "a".repeat(1001) }],
        ["malformed JSON", "{not json"],
        ["a non-object body", "[]"],
      ];
      for (const [name, body] of invalid) {
        it(`returns 400 for ${name}`, async () => {
          const before = fixture.insights.selectAll().length;
          const res = await request(app, "POST", "/insights", body);
          expect(res.status).toBe(400);
          expect(await res.json()).toEqual({ error: expect.any(String) });
          expect(fixture.insights.selectAll()).toHaveLength(before);
        });
      }
    });
  });

  describe("#12 DELETE /insights/:id", () => {
    withDB((fixture) => {
      const app = createApp(fixture.db);

      beforeAll(() => {
        const createdAt = new Date().toISOString();
        fixture.insights.insert([
          { brand: 1, createdAt, text: "keep" },
          { brand: 2, createdAt, text: "remove" },
        ]);
      });

      it("returns 204 and deletes the insight", async () => {
        const res = await request(app, "DELETE", "/insights/2");
        expect(res.status).toBe(204);
        expect(fixture.insights.selectAll().map((row) => row.id)).toEqual([1]);
      });

      it("returns 404 for an unknown id", async () => {
        const res = await request(app, "DELETE", "/insights/2");
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ error: "Insight not found" });
      });

      for (const id of ["abc", "0", "-1", "1.5"]) {
        it(`returns 400 for invalid id "${id}"`, async () => {
          const res = await request(app, "DELETE", `/insights/${id}`);
          expect(res.status).toBe(400);
          expect(fixture.insights.selectAll()).toHaveLength(1);
        });
      }
    });
  });
});
