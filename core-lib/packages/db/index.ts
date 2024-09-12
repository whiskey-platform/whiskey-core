import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Secrets } from "@whiskey/secrets";
import { logger } from "@whiskey/logging";

export const db = async (schema: any) => {
  const secrets = new Secrets();
  const connectionString = await secrets.get("DB_CONNECTION");
  logger.info("Connecting to database");
  const client = postgres(connectionString, { prepare: false });
  logger.info("Connection to database successful");
  return drizzle(client, { schema });
};
