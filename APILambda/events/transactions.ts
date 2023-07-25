import {
  SQLExecutable,
  selectLastInsertionNumericId
} from "../dbconnection.js";
import { ServerEnvironment } from "../env.js";
import { userNotFoundBody, userWithIdExists } from "../user/index.js";
import { Result, createTokenRequest } from "../utils.js";
import { insertEvent } from "./SQLStatements.js";
import { CreateEventInput } from "./models.js";
import { getEvent, isUserInEvent, isUserBlocked } from "./SQL.js";
import { resolve } from "path";

export const createEvent = async (
  environment: ServerEnvironment,
  conn: SQLExecutable,
  hostId: string,
  input: CreateEventInput
) => {
  const userExists = await userWithIdExists(conn, hostId);
  if (!userExists) {
    return { status: "error", value: userNotFoundBody(hostId) };
  }

  const result = await environment.conn.transaction(async (tx) => {
    await insertEvent(tx, input, hostId);
    return { id: await selectLastInsertionNumericId(tx) };
  });

  return { status: "success", value: result };
};

export const createTokenRequestWithPermissionsTransaction = async (environment: ServerEnvironment, conn: SQLExecutable, eventId: number, userId: string): Promise<
Result<{ id: string, tokenRequest: Promise<unknown>}, "event does not exist" | "user is not apart of event" | "user is blocked by event host" | "cannot generate token">
> => {  

    const eventDetails = await environment.conn.transaction(async (tx) => {
      const event = await getEvent(tx, eventId);

      if (event === null) {
        return 'event-not-found';
      }

      const userInEvent = await isUserInEvent(tx, userId, eventId);

      if (!userInEvent) {
        return 'user-not-in-event';
      }

      const userBlocked = await isUserBlocked(tx, userId, event.rows[0].hostId);

      if (userBlocked) {
        return 'user-blocked';
      }

      return event.rows[0];
    });

    if (eventDetails === 'event-not-found') {
      return {status: "error", value: "event does not exist"};
    } else if (eventDetails === 'user-not-in-event') {
      return {status: "error", value: "user is not apart of event"};
    } else if (eventDetails === 'user-blocked') {
      return {status: "error", value: "user is blocked by event host"};
    }

    const role = () => {
      if (eventDetails.ownerId === userId) {
        return "admin";
      } else if (new Date(eventDetails.endTimeStamp) <= new Date()) {
        return "attendee";
      } else {
        return "viewer";
      }
    };

    const permissions = () => {

      switch(role()) {
        case "admin":
          return {
            [`eventId`]: ["history", "subscribe", "publish"], 
            [`eventId-pinned`]: ["history", "subscribe", "publish"]
          };
        case "attendee":
          return {
            [`eventId`]: ["history", "subscribe", "publish"], 
            [`eventId-pinned`]: ["history", "subscribe"]
          };
        case "viewer":
          return {
            [`eventId`]: ["history"], 
            [`eventId-pinned`]: ["history"]
          };
      }
    }

    try {
      const tokenRequest = createTokenRequest(permissions, userId);
      return {status: 'success', value: {id: userId, tokenRequest: tokenRequest}};
    } catch {
      return {status: 'error', value: 'cannot generate token'};
    }
}
