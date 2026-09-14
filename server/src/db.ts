import postgres, { type Sql } from 'postgres';

export type Database = Sql;

export function createDatabase(url: string): Database {
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => undefined
  });
}
