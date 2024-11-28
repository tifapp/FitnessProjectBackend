import dotenv from "dotenv"
import { join } from "path"
import { z } from "zod"

dotenv.config({ path: join(__dirname, "../../.env") })
dotenv.config()

const EnvSchema = z
  .object({
    AWS_LAMBDA_FUNCTION_NAME: z.string(),
    AWS_REGION: z.string(),
    AWS_ACCOUNT_ID: z.string()
  })
  .passthrough()

/**
 * A type-safe representation of the current env vars.
 */
export const AWSEnvVars = EnvSchema.parse(process.env)
