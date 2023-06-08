import { z } from "zod";
<<<<<<< HEAD:APILambda/events/db.ts
import { SQLExecutable } from "../dbconnection.js";
import { LocationCoordinate2D } from "../location.js";
import { EventColor } from "./models.js";
=======
import { SQLExecutable } from "../dbconnection";
import { LocationCoordinate2D } from "../location";
import { EventColor } from "./models";
import { userNotFoundBody, userWithIdExists } from "../user";
<<<<<<< HEAD:APILambda/events/db.ts
>>>>>>> 5fbff49 (created test to test that you get a 404 if a user that doesn't exist tries to create an event):events/db.ts
=======
import { ServerEnvironment } from "../env";
>>>>>>> c2f0123 (tried to create test for if user exists they should be able to create an event but it doesn't work):events/db.ts

const CreateEventSchema = z.object({
  description: z.string().max(500),
  startDate: z.string(),
  endDate: z.string(),
  color: z.number(),
  title: z.string().max(50),
  shouldHideAfterStartDate: z.number(), //  can only be 0 or 1
  isChatEnabled: z.number(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type CreateEventInput = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
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
export const insertEvent = async (
  conn: SQLExecutable,
  request: CreateEventInput,
  hostId: string
) => {
  await conn.execute(
    `
    INSERT INTO Event (
      hostId,
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
      :hostId,
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
    {...request, hostId}
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

export const getLastEventId = async (
  conn: SQLExecutable
) => {
  await conn.execute(
  `SELECT E.id FROM Event E WHERE E.id = LAST_INSERT_ID()`
  );
};

export const createEvent = async (
  environment: ServerEnvironment,
  conn: SQLExecutable,
  hostId: string,
  input: CreateEventInput
) => {
  const userExists = await userWithIdExists(conn, hostId);
  if (!userExists) {
    return {status: "error", value: userNotFoundBody(hostId)}
  }

  const result = await environment.conn.transaction(async (tx) => {
    insertEvent(conn, input, hostId);
    const results = getLastEventId(conn);
    console.log(results);
  })

  return {status: "success"};

}
