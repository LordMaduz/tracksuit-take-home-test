import type { Database } from "@db/sqlite";
import * as oak from "@oak/oak";
import { z } from "zod";
import * as insightsTable from "$tables/insights.ts";
import listInsights from "./operations/list-insights.ts";
import lookupInsight from "./operations/lookup-insight.ts";

// Digits only, so "1.5", "1e2", " 1" and "0x1" are rejected rather than coerced.
const Id = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(
  z.number().safe(),
);

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

  const app = new oak.Application();

  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
};
