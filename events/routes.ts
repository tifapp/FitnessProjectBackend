import express from "express";
import { ServerEnvironment } from "../env";
import { createEvent, getEvents } from "../events";

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for event related operations.
 */

/**
 * Returns an object that indicates that can be used as the response
 * body when an event is not found.
 *
 * @param eventId the id of the user who was not found.
 */
export const eventNotFoundBody = (eventId: number) => ({
  eventId,
  error: "event-not-found"
});

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

  //router.get("/event/:eventId", )
  return router;
};
