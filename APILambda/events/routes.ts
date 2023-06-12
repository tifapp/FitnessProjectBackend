import { invokeLambda } from "@layer/utils.js";
import express from "express";
import { ServerEnvironment } from "../env.js";
import { createEvent, getEvents } from "../events";

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
      invokeLambda("geocodingPipeline", {location: req.body.location})
      return await createEvent(environment, tx, res.locals.selfId, req.body);
    });
    if (result.status === "error") {
      return res.status(404).json(result.value)
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

  //router.get("/event/:eventId", )
  return router;
};
