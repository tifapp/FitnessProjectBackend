/* eslint-disable @typescript-eslint/naming-convention */
// Env variables
import { z } from "zod"

const TestEnvSchema = z
  .object({
    API_ENDPOINT: z.string().url().optional(),
    COGNITO_CLIENT_APP_ID: z.string().optional(),
    COGNITO_USER_POOL_ID: z.string().optional()
  }).passthrough()

export const testEnvVars = TestEnvSchema.parse(process.env)
export type TestEnvSchema = z.infer<typeof TestEnvSchema>
