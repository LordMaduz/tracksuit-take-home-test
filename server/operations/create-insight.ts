import type { Insight } from "../../lib/insight.ts";
import type { HasDBClient } from "../shared.ts";
import * as insightsTable from "$tables/insights.ts";

type Input = HasDBClient & {
  brand: number;
  text: string;
};

export default (input: Input): Insight => {
  console.log(`Creating insight for brand=${input.brand}`);

  const createdAt = new Date();
  input.db.prepare(insightsTable.insertStatement).run({
    brand: input.brand,
    createdAt: createdAt.toISOString(),
    text: input.text,
  });

  const result = {
    id: input.db.lastInsertRowId,
    brand: input.brand,
    createdAt,
    text: input.text,
  };
  console.log("Insight created:", result);
  return result;
};
