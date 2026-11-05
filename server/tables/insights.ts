export const createTable = `
  CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY ASC NOT NULL,
    brand INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    text TEXT NOT NULL
  )
`;

export type Row = {
  id: number;
  brand: number;
  createdAt: string;
  text: string;
};

export type Insert = {
  brand: number;
  createdAt: string;
  text: string;
};

// Named parameters, bound by SQLite: never build SQL from values (#9).
export const insertStatement =
  "INSERT INTO insights (brand, createdAt, text) VALUES (:brand, :createdAt, :text)";
