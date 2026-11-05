import { Database } from "@db/sqlite";
import * as path from "@std/path";
import { Port } from "../lib/utils/index.ts";
import { createApp } from "./app.ts";

console.log("Loading configuration");

const env = {
  port: Port.parse(Deno.env.get("SERVER_PORT")),
};

const dbFilePath = path.resolve("tmp", "db.sqlite3");

console.log(`Opening SQLite database at ${dbFilePath}`);

await Deno.mkdir(path.dirname(dbFilePath), { recursive: true });
const db = new Database(dbFilePath);

console.log("Initialising server");

createApp(db).listen(env);
console.log(`Started server on port ${env.port}`);
