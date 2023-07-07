import express from "express";
import { ServerEnvironment } from "../env";
import { createEventReport } from "./db";

/**
 * Creates routes related to reporting operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for report related operations.
 */
export const createReportRouter = (environment: ServerEnvironment) => {
  const router = express.Router();
  /**
   * Create a report
   */
  router.post("/", async (req, res) => {
    const result = await environment.conn.transaction(async (tx) => {
      const result = await createEventReport(tx, {
        selfId: res.locals.selfId,
        ...req.body,
      });
      console.log("result:" + result);
      return result;
    });
    return res.status(200).json({ result });
  });
}