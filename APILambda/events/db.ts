import { z } from "zod";
import {
  SQLExecutable,
  queryFirst,
  selectLastInsertionId,
  selectLastInsertionNumericId
} from "../dbconnection.js";
import { ServerEnvironment } from "../env.js";
import { LocationCoordinate2D } from "../location.js";
import { userNotFoundBody, userWithIdExists } from "../user";
import { EventColor, EventColorSchema } from "./models.js";


export const CreateEventSchema = z
  .object({
    description: z.string().max(500),
    startTimestamp: z.string().datetime(),
    endTimestamp: z.string().datetime(),
    color: EventColorSchema,
    title: z.string().max(50),
    shouldHideAfterStartDate: z.boolean(),
    isChatEnabled: z.boolean(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
  .transform((res) => ({
    ...res,
    startTimestamp: new Date(res.startTimestamp),
    endTimestamp: new Date(res.endTimestamp)
  }));

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

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
export const insertEvent = async (
  conn: SQLExecutable,
  request: CreateEventInput,
  hostId: string
) => {
  console.log(request);
  await conn.execute(
    `
    INSERT INTO event (
      hostId,
      title, 
      description, 
      startTimestamp, 
      endTimestamp, 
      color, 
      shouldHideAfterStartDate, 
      isChatEnabled, 
      latitude, 
      longitude
    ) VALUES (
      :hostId,
      :title, 
      :description, 
      FROM_UNIXTIME(:startTimestamp), 
      FROM_UNIXTIME(:endTimestamp), 
      :color, 
      :shouldHideAfterStartDate, 
      :isChatEnabled, 
      :latitude, 
      :longitude
    )
    `,
    { ...request, startTimestamp: request.startTimestamp.getTime() / 1000, endTimestamp: request.endTimestamp.getTime() / 1000, hostId }
  );
};

export const getEvents = async (
  conn: SQLExecutable,
  request: GetEventsRequest
) => {
  await conn.execute(
    `SELECT E.*, COUNT(A.userId) AS attendee_count, 
    CASE WHEN F.user IS NOT NULL THEN 1 ELSE 0 END AS is_friend 
    FROM event E JOIN Location L ON E.id = L.eventId 
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

export const getLastEventId = async (conn: SQLExecutable) => {};

export type DatabaseEvent = {
  id: string
  title: string
  description: string
  startTimestamp: Date
  endTimestamp: Date
  color: EventColor
  latitude: number
  longitude: number
  shouldHideAfterStartDate: boolean
  isChatEnabled: boolean
}

export const getEventWithId = async (
  conn: SQLExecutable,
  eventId: number
) => await queryFirst<DatabaseEvent>(conn, `SELECT * FROM event WHERE id=:eventId`, {eventId});

export const createEvent = async (
  conn: SQLExecutable,
  hostId: string,
  input: CreateEventInput
) => {
  const userExists = await userWithIdExists(conn, hostId);
  if (!userExists) {
    return { status: "error", value: userNotFoundBody(hostId) };
  }

  await insertEvent(conn, input, hostId);

  return { status: "success", value: { id: await selectLastInsertionId(conn) } };
};
