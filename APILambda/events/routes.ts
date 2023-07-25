import express from "express";
import { ServerEnvironment } from "../env.js";
import { createEvent, getEvents } from "./SQL.js";
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
      const result = await createEvent(tx, {
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
   
    const result = createTokenRequestWithPermissionsTransaction(environment, environment.conn, Number(req.params.eventId), res.locals.selfId)

    const value = (await result).value;
    if (value === "event does not exist") {
      return 404;
    } else if (value === "user is not apart of event") {
      return 403;
    } else if (value === "user is blocked by event host") {
      return 403;
    } else if (value === "cannot generate token") {
      return 403;
    }else {
      return {
        statusCode: 200,
        body: JSON.stringify((await result).value),
      };
    }
    
  });

  return router;
};