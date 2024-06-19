import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

let _dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(_dirname, '../../.env') });
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