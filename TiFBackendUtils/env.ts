/* eslint-disable @typescript-eslint/naming-convention */
// Env variables
import dotenv from "dotenv"
import { join } from "path"
import { z } from "zod"
import { localPrivateIPV4Address } from "./ipaddress"

dotenv.config({ path: join(__dirname, "../.env") })
dotenv.config()

const EnvSchema = z
  .object({
    ENVIRONMENT: z
      .union([
        z.literal("devTest"),
        z.literal("stagingTest"),
        z.literal("staging"),
        z.literal("prod")
      ])
      .optional()
      .default("devTest"),
    DATABASE_HOST: z.string(),
    DATABASE_PORT: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_USERNAME: z.string(),
    DATABASE_NAME: z
      .string()
      .min(1, { message: "Database name must be at least 1 character long." })
      .max(16, {
        message: "Database name must be no more than 16 characters long."
      })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message:
          "Database name must only contain alphanumeric characters and underscores."
      }),
    JWT_SECRET: z.string(),
    CA_PEM: z.string().optional(),
    COGNITO_USER_POOL_ID: z.string().optional(),
    ABLY_KEY: z.string().optional(),
    DEV_TEST_HOST: z
      .string()
      .optional()
      .default(localPrivateIPV4Address() ?? "127.0.0.1"),
    DEV_TEST_PORT: z.coerce.number().optional().default(5000)
  })
  .passthrough()

export type EnvSchema = z.infer<typeof EnvSchema>

/**
 * A type-safe representation of the current env vars.
 */
export const envVars = EnvSchema.parse(process.env)
