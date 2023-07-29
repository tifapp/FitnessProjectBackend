import {
  SQLExecutable,
  //selectLastInsertionNumericId,
  hasResults
} from "../dbconnection.js";
import { ServerEnvironment } from "../env.js";
import { userNotFoundBody, userWithIdExists } from "../user/index.js";
import { Result } from "../utils.js";
import { createTokenRequest } from "../ably.js";
import { getEvent, insertEvent, CreateEventRequest } from "./SQL.js";
import { resolve } from "path";


// export const createEvent = async (
//   environment: ServerEnvironment,
//   conn: SQLExecutable,
//   hostId: string,
//   input: CreateEventRequest
// ): Promise<Result<{id:string}, string>> => {
//   const userExists = await userWithIdExists(conn, hostId);
//   if (!userExists) {
//     return { status: "error", value: userNotFoundBody(hostId) };
//   }

//   const result = await environment.conn.transaction(async (tx) => {
//     await insertEvent(tx, input, hostId);
//     return { id: await selectLastInsertionNumericId(tx) };
//   });

//   return { status: "success", value: result };
// };

export const createTokenRequestWithPermissionsTransaction = async (environment: ServerEnvironment, conn: SQLExecutable, eventId: number, userId: string): Promise<
Result<{ id: string, tokenRequest: Promise<unknown>}, "event does not exist" | "user is not apart of event" | "user is blocked by event host" | "cannot generate token">
> => {  

    const eventDetails = await environment.conn.transaction(async (tx) => {
      const event = await getEvent(tx, eventId);

      if (event === null) {
        return {status: "error", value: "event does not exist"};
      }

      const userInEvent = await hasResults(conn, "SELECT TRUE FROM eventAttendance WHERE userId = :userId AND eventId = :eventId;", [userId, eventId]);

      if (!userInEvent) {
        return {status: "error", value: "user is not apart of event"}
      }

      const userBlocked = await hasResults(conn, "SELECT TRUE FROM userRelations WHERE fromUserId = :hostId AND toUserId = :userId AND status = 'blocked';", [userId, event.rows[0].hostId]);

      if (userBlocked) {
        return {status: "error", value: "user is blocked by event host"};
      }

      return event.rows[0];
    });

    if (eventDetails.status === "error") {
      return eventDetails;
    }

    let role = "viewer"

    if (eventDetails.ownerId === userId) {
      role = "admin";
    } else if (new Date(eventDetails.endTimeStamp) <= new Date()) {
      role = "attendee";
    }

    let permissions = {
      [`${eventId}`]: ["history"], 
      [`${eventId}-pinned`]: ["history"]
    };

    switch(role) {
      case "admin":
        permissions = {
          [`${eventId}`]: ["history", "subscribe", "publish"], 
          [`${eventId}-pinned`]: ["history", "subscribe", "publish"]
        };
      case "attendee":
        permissions = {
          [`${eventId}`]: ["history", "subscribe", "publish"], 
          [`${eventId}-pinned`]: ["history", "subscribe"]
        };
    }

    try {
      const tokenRequest = createTokenRequest(permissions, userId);
      return {status: 'success', value: {id: userId, tokenRequest: tokenRequest}};
    } catch {
      return {status: 'error', value: 'cannot generate token'};
    }
}
