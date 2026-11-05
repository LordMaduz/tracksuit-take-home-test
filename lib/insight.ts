import { z } from "zod";

export const Insight = z.object({
  id: z.number().int().positive(),
  brand: z.number().int(),
  // JSON carries dates as ISO strings; parse them back into a Date.
  createdAt: z.coerce.date(),
  text: z.string(),
});

export type Insight = z.infer<typeof Insight>;
