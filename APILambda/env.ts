/* eslint-disable @typescript-eslint/naming-convention */
// Env variables
import { PromiseResult } from "TiFBackendUtils"
import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

const EnvSchema = z
  .object({
    DATABASE_HOST: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_USERNAME: z.string(),
    ABLY_KEY: z.string(),
    AWS_REGION: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    COGNITO_USER_POOL_ID: z.string()
  })
  .passthrough()

export type EnvSchema = z.infer<typeof EnvSchema>

/**
 * A type-safe representation of the current env vars.
 */
export const envVars = EnvSchema.parse(process.env)

export type CreateUserProfileEnvironment = {
  setProfileCreatedAttribute: (userId: string) => PromiseResult<unknown, unknown>
}

export type SetArrivalStatusEnvironment = {
  maxArrivals: number,
}

/**
 * A type that holds all external dependencies of this server.
 *
 * This should be used to hold onto external dependencies that we have
 * no control over and thus should be stubbed in integration tests.
 *
 * Examples of this include AWS S3 buckets, or SNS/Push notification clients.
 */
export type ServerEnvironment = CreateUserProfileEnvironment & SetArrivalStatusEnvironment & {
  environment: "dev" | "staging" | "prod",
}
