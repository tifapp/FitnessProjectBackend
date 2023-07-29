import express from "express";
import { ServerEnvironment } from "../env.js";
import { insertEvent, getEvents } from "./SQL.js";
import {createTokenRequestWithPermissionsTransaction } from "./transactions.js";

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for event related operations.
 */
export const createEventRouter = (environment: ServerEnvironment) => {
  const router = express.Router();
  /**
   * Create an event
   */
  router.post("/", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      const result = await insertEvent(tx, {
        userId: res.locals.selfId,
        ...req.body,
      });
      console.log("result:" + result);
      return res.status(200).json({ result });
    });
  });
  /** 
   * Get events by region
   */
  router.get("/", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      console.log("query params");
      console.log(req.query);
      const result = await getEvents(tx, {
        userId: res.locals.selfId,
        longitude: req.query.longitude as unknown as number,
        latitude: req.query.latitude as unknown as number,
        radiusMeters: req.query.radiusMeters as unknown as number,
      });
      console.log("result:" + result);
      return res.status(200).json({ result });
    });
  });

  /** 
   * Get token for event's chat room
   */
  router.get("/chat/:eventId", async (req, res) => {
   
    const result = await createTokenRequestWithPermissionsTransaction(environment, environment.conn, Number(req.params.eventId), res.locals.selfId)

    if (result.status === "error") {
      return {
        statusCode: 404,
        body: JSON.stringify(result.value)
      }
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
      };
    }
  });

  return router;
};