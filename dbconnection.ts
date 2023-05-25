import { connect } from "@planetscale/database";
import fetch from "node-fetch";

const config = {
  fetch,
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

/**
 * The main planet scale connection to use.
 */
export const conn = connect(config);
