import express from "express";
import { ServerEnvironment } from "../env.js";
import { createEvent, getEvents } from "./db.js";

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
    const result = await environment.conn.transaction(async (tx) => {
      return await createEvent(tx, res.locals.selfId, req.body);
    });
    if (result.status === "error") {
      return res.status(404).json(result.value);
    }
    return res.status(201).json(result.value);
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

  router.get("/:eventId", async (req, res) => {
    return res
      .status(404)
      .json({
        error: "event-not-found",
        eventId: parseInt(req.params.eventId),
      });
  });
  return router;
};
