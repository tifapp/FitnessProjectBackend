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
export const eventRouter = (environment: ServerEnvironment) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    await withValidatedRequest(req, res, CreateEventSchema, async (data) => {
      
      return res.status(201).json({ id: res.locals.selfId });
    });
  });

  router.get("/", async (req, res) => {
    await environment.conn.transaction(async (tx) => {
      const result = await getEvents(tx, {
        selfId: res.locals.selfId,
        ...req.query,
      });
      console.log("result:" + result);
      return res.status(200).json({ result });
    });
  });
}

const CreateEventSchema = z.object({
  description: z.string().max(500),
  handle: z.string().regex(/^[a-z_0-9]{1,15}$/),
  startDate: z.date(),
  endDate: z.date(),
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
  latitude: number;
  longitude: number;
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
   `SELECT E.name AS event_name, E.description, E.eventId, E.ownerId, E.startDate, E.endDate, COUNT(A.userId) AS attendee_count, 
    CASE WHEN F.user IS NOT NULL THEN 1 ELSE 0 END AS is_friend 
    FROM Event E JOIN Location L ON E.eventId = L.eventId 
    LEFT JOIN eventAttendance A ON E.eventId = A.eventId 
    LEFT JOIN Friends F ON E.ownerId = F.friend AND F.user = :userId 
    WHERE ST_Distance_Sphere(POINT(:longitude, :latitude), POINT(lon, lat)) < :radiusMeters 
    AND E.endDate > NOW() 
    AND :userId NOT IN (SELECT blocked 
    FROM blockedUsers 
    WHERE user = E.ownerId AND blocked = :userId) 
    GROUP BY E.eventId
  `
  )
}