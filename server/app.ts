import type { Database } from "@db/sqlite";
import * as oak from "@oak/oak";
import { z } from "zod";
import * as insightsTable from "$tables/insights.ts";
import { BrandId } from "../lib/brands.ts";
import createInsight from "./operations/create-insight.ts";
import listInsights from "./operations/list-insights.ts";
import lookupInsight from "./operations/lookup-insight.ts";

// Digits only, so "1.5", "1e2", " 1" and "0x1" are rejected rather than coerced.
const Id = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(
  z.number().safe(),
);

// Only the fields the client owns; zod drops anything else (id, createdAt).
const NewInsight = z.object({
  brand: BrandId,
  text: z.string().trim().min(1).max(1000),
});

const fail = (ctx: oak.Context, status: number, error: string) => {
  ctx.response.status = status;
  ctx.response.body = { error };
};

export const createApp = (db: Database): oak.Application => {
  db.exec(insightsTable.createTable);

  const router = new oak.Router();

  router.get("/_health", (ctx) => {
    ctx.response.body = "OK";
    ctx.response.status = 200;
  });

  router.get("/insights", (ctx) => {
    ctx.response.body = listInsights({ db });
    ctx.response.status = 200;
  });

  router.get("/insights/:id", (ctx) => {
    const id = Id.safeParse(ctx.params.id);
    if (!id.success) return fail(ctx, 400, "Invalid insight id");

    const result = lookupInsight({ db, id: id.data });
    if (!result) return fail(ctx, 404, "Insight not found");

    ctx.response.body = result;
    ctx.response.status = 200;
  });

  router.post("/insights", async (ctx) => {
    const body = await ctx.request.body.json().catch(() => undefined);
    const input = NewInsight.safeParse(body);
    if (!input.success) {
      const [issue] = input.error.issues;
      return fail(
        ctx,
        400,
        issue.path.length
          ? `${issue.path.join(".")}: ${issue.message}`
          : "Request body must be a JSON object",
      );
    }

    ctx.response.body = createInsight({ db, ...input.data });
    ctx.response.status = 201;
  });

  const app = new oak.Application();

  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
};
