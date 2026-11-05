import type { HasDBClient } from "../shared.ts";

type Input = HasDBClient & {
  id: number;
};

export default (input: Input): boolean => {
  console.log(`Deleting insight for id=${input.id}`);

  const changes = input.db.exec("DELETE FROM insights WHERE id = ?", input.id);

  console.log(changes ? "Insight deleted" : "Insight not found");
  return changes > 0;
};
