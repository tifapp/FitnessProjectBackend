import express from "express";
import { ServerEnvironment } from "../env.js";
import { createEvent, getEvents } from "./SQL.js";

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
    // given a channel id, return the signed token + permissions
   
    //const result = createTokenRequestWithPermissionsTransaction(environment.conn, req.params.channel, res.locals.selfId)

    /*
    router
    if result.status === "error" {
      //if error is 'event does not exist', return 404
      //if error is 'user is not apart of event', return 403
      //if error is 'user is blocked by event host', return 403
      //if error is 'cannot generate tokenRequest', return 500
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
      };
    }
    */
  });

  //router.get("/event/:eventId", )
  return router;
};

/*
inside test:
const result = await request(app).get("/event/chat/9").set("Authorization", req.id);
*/