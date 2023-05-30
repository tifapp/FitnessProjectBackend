import express from "express";
import { SQLExecutable } from "./dbconnection.js";
import { ServerEnvironment } from "./env.js";
import { LocationCoordinate2D } from "./location.js";
import { insertUser } from "./users.js";
import { withValidatedRequest } from "./validation.js";
import { z } from "zod";



/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 * @returns a router for user related operations.
 */
export const EventRouter = (environment: ServerEnvironment) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    await withValidatedRequest(req, res, CreateEventSchema, async (data) => {
      
      return res.status(201).json({ id: res.locals.selfId });
    });
  });

  router.get("/", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      console.log("query params");
      console.log(req.query);
      const result = await getEvents(tx, {
        userId: res.locals.selfId,
        longitude: req.query.longitude as unknown as number,
        latitude: req.query.latitude as unknown as number,
        radiusMeters: req.query.radiusMeters as unknown as number
      });
      console.log("result:" + result);
      return res.status(200).json({ result });
    });
  });
  return router;
}

const CreateEventSchema = z.object({
  description: z.string().max(500),
  startDate: z.string(),
  endDate: z.string(),
  color: z.number(),
  title: z.string().max(50),
  shouldHideAfterStartDate: z.number(), //  can only be 0 or 1
  isChatEnabled: z.number(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});


export type EventColor =
  | "#EF6351"
  | "#CB9CF2"
  | "#88BDEA"
  | "#72B01D"
  | "#F7B2BD"
  | "#F4845F"
  | "#F6BD60";

export type CreateEventRequest = {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  color: EventColor;
  shouldHideAfterStartDate: boolean;
  isChatEnabled: boolean;
} & LocationCoordinate2D;

export type GetEventsRequest = {
  userId: string;
  latitude: number | string;
  longitude: number | string;
  radiusMeters: number;
}

/**
 * Creates an event in the database.
 *
 * @param request see {@link CreateEventRequest}
 */
export const createEvent = async (
  conn: SQLExecutable,
  request: CreateEventRequest
) => {
  await conn.execute(
    `
    INSERT INTO Event (
        title, 
        description, 
        startDate, 
        endDate, 
        color, 
        shouldHideAfterStartDate, 
        isChatEnabled, 
        latitude, 
        longitude
    ) VALUES (
      :title, 
      :description, 
      :startDate, 
      :endDate, 
      :color, 
      :shouldHideAfterStartDate, 
      :isChatEnabled, 
      :latitude, 
      :longitude
    )
    `,
    request
  );
};

export const getEvents = async (
  conn: SQLExecutable,
  request: GetEventsRequest
) => {
  await conn.execute( 
   `SELECT E.*, COUNT(A.userId) AS attendee_count, 
    CASE WHEN F.user IS NOT NULL THEN 1 ELSE 0 END AS is_friend 
    FROM Event E JOIN Location L ON E.id = L.eventId 
    LEFT JOIN eventAttendance A ON E.id = A.eventId 
    LEFT JOIN Friends F ON E.hostId = F.friend AND F.user = :userId 
    WHERE ST_Distance_Sphere(POINT(:longitude, :latitude), POINT(lon, lat)) < :radiusMeters 
    AND E.endDate > NOW() 
    AND :userId NOT IN (SELECT blocked 
    FROM blockedUsers 
    WHERE user = E.hostId AND blocked = :userId) 
    GROUP BY E.id
  `,
  request
  );
};