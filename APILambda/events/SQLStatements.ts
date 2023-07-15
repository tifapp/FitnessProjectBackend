import {
  SQLExecutable
} from "../dbconnection.js";
import { CreateEventInput, GetEventsRequest } from "./models.js";


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
      startTimeStamp, 
      endTimeStamp, 
      color, 
      shouldHideAfterStartDate, 
      isChatEnabled, 
      latitude, 
      longitude
    ) VALUES (
      :hostId,
      :title, 
      :description, 
      FROM_UNIXTIME(:startTimeStamp), 
      FROM_UNIXTIME(:endTimeStamp), 
      :color, 
      :shouldHideAfterStartDate, 
      :isChatEnabled, 
      :latitude, 
      :longitude
    )
    `,
    { ...request, hostId }
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

