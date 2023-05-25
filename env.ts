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
