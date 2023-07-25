import { z } from "zod";
import { SQLExecutable } from "../dbconnection.js";
import { LocationCoordinate2D } from "../location.js";
import { EventColor } from "./models.js";

const CreateEventSchema = z.object({
  description: z.string().max(500),
  startTimeStamp: z.string(),
  endTimeStamp: z.string(),
  color: z.number(),
  title: z.string().max(50),
  shouldHideAfterStartDate: z.number(), //  can only be 0 or 1
  isChatEnabled: z.number(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type CreateEventRequest = {
  title: string;
  description: string;
  startTimeStamp: Date;
  endTimeStamp: Date;
  color: EventColor;
  shouldHideAfterStartDate: boolean;
  isChatEnabled: boolean;
} & LocationCoordinate2D;

export type GetEventsRequest = {
  userId: string;
  latitude: number | string;
  longitude: number | string;
  radiusMeters: number;
};

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
      hostId,
      title, 
      description, 
      startTimeStamp, 
      endTimeStamp, 
      color, 
      shouldHideAfterStartDate, 
      isChatEnabled, 
      latitude, 
      longitude
    ) VALUES (
      :userId,
      :title, 
      :description, 
      :, 
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

export const getEvent = async (
  conn: SQLExecutable,
  eventId: number
): Promise<any> => {
  const result = await conn.execute(
    `
    SELECT * FROM Event WHERE ID = :eventId;
    `,
  );

  return result;
};

export const isUserInEvent = async (
  conn: SQLExecutable,
  userId: string,
  eventId: number
): Promise<boolean> => {
  const result = await conn.execute(
    `
    SELECT * FROM eventAttendance WHERE userId = :userId AND eventId = :eventId;
    `,
    { userId, eventId }
  );

  return result.rows.length > 0;
};

export const isUserBlocked = async (
  conn: SQLExecutable,
  userId: string,
  hostId: string
): Promise<boolean> => {
  const result = await conn.execute(
    `
    SELECT * FROM userRelations WHERE fromUserId = :hostId AND toUserId = :userId AND status = 'blocked';
    `,
  );

  return result.rows.length > 0;
}