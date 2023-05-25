import { connect } from "@planetscale/database";
import fetch from "node-fetch";
import { envVars } from "./env";
/**
 * The main planet scale connection to use.
 */
export const conn = connect({
  fetch,
  host: envVars.DATABASE_HOST,
  username: envVars.DATABASE_USERNAME,
  password: envVars.DATABASE_PASSWORD,
});
