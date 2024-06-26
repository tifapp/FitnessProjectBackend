/* eslint-disable @typescript-eslint/naming-convention */
// Env variables
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

let _dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(_dirname, '../.env') });
dotenv.config()

const EnvSchema = z
  .object({
    ENVIRONMENT: z.union([
      z.literal('devTest'),
      z.literal('stagingTest'),
      z.literal('staging'),
      z.literal('prod')
    ]).optional().default('devTest'),
    DATABASE_HOST: z.string(),
    DATABASE_PORT: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_USERNAME: z.string(),
    DATABASE_NAME: z.string()
      .min(1, { message: "Database name must be at least 1 character long." })
      .max(16, { message: "Database name must be no more than 16 characters long." })
      .regex(/^[a-zA-Z0-9_]+$/, { message: "Database name must only contain alphanumeric characters and underscores." }),
    CA_PEM: z.string().optional(),
    ABLY_KEY: z.string().optional(),
    COGNITO_USER_POOL_ID: z.string().optional(),
    API_SPECS_ENDPOINT: z.string().url().optional(),
    API_SPECS_LAMBDA_ID: z.string().optional()
  })
  .passthrough()

export type EnvSchema = z.infer<typeof EnvSchema>

/**
 * A type-safe representation of the current env vars.
 */
export const envVars = EnvSchema.parse(process.env)
