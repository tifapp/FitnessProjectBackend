import { Connection } from "@planetscale/database";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvVarsSchema = z
  .object({
    DATABASE_HOST: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_USERNAME: z.string(),
  })
  .passthrough();

/**
 * A type-safe representation of the current env vars.
 */
export const envVars = EnvVarsSchema.parse(process.env);

/**
 * A type that holds all external dependencies of this server.
 *
 * This should be used to hold onto external dependencies that we have
 * no control over and thus should be stubbed in integration tests.
 *
 * Examples of this include AWS S3 buckets, or SNS/Push notification clients.
 */
export type ServerEnvironment = {
  conn: Connection;
};
