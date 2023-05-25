import { connect } from "@planetscale/database";
import fetch from "node-fetch";
import dotenv from "dotenv";
import app from "../app";

dotenv.config();

const config = {
  fetch,
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

const conn = connect(config);

describe("Database tests", () => {
  describe("EventsByRegion tests", () => {
    it("thing", async () => {
      console.log(
        await conn.execute("SELECT * FROM Location").then((row) => row.rows)
      );
    });
  });
});
