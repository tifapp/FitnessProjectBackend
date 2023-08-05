import { Connection, DatabaseError } from "@planetscale/database";
import { AblyTokenRequest, ChatPermissions, createTokenRequest } from "../ably.js";
import {
  //selectLastInsertionNumericId,
  hasResults
} from "../dbconnection.js";
import { Result } from "../utils.js";
import { DatabaseEvent, getEventWithId } from "./SQL.js";


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

type EventUserAccessError = "event does not exist" | "user is not apart of event" | "user is blocked by event host"

type ChatResult = Result<{ id: string, tokenRequest: AblyTokenRequest}, EventUserAccessError | "cannot generate token">

type EventResult = Result< DatabaseEvent, EventUserAccessError>

export const createTokenRequestWithPermissionsTransaction = async (conn: Connection, eventId: number, userId: string): Promise<
ChatResult> => {  
  
    const result:EventResult = await conn.transaction(async (tx) => {
      const event = await getEventWithId(tx, eventId);
      
      if (event == null) {
        return {status: "error", value: "event does not exist"};
      }

      const userInEvent = await hasResults(conn, "SELECT TRUE FROM eventAttendance WHERE userId = :userId AND eventId = :eventId;", {userId, eventId});
      console.log("User in event, ", userInEvent);
      if (!userInEvent) {
        return {status: "error", value: "user is not apart of event"}
      }

      const userBlocked = await hasResults(conn, "SELECT TRUE FROM userRelations WHERE fromUserId = :hostId AND toUserId = :userId AND status = 'blocked';", {userId, hostId: event.hostId});

      if (userBlocked) {
        return {status: "error", value: "user is blocked by event host"};
      }

      return {status: "success", value: event};
    });

    if (result.status === "error") {
      return result;
    }

    const permissions = determineChatPermissions(result.value.hostId, result.value.endTimestamp, userId, eventId);

    try {
      const tokenRequest = await createTokenRequest(permissions, userId);
      return {status: 'success', value: {id: userId, tokenRequest: tokenRequest}};
    } catch {
      return {status: 'error', value: 'cannot generate token'};
    }
}

const determineChatPermissions = (hostId: string, endTimestamp: Date, userId: string, eventId: number): ChatPermissions => {
  let role: string = "viewer";

  if (hostId === userId) {
    role = "admin";
  } else if (new Date(endTimestamp) <= new Date()) {
    role = "attendee";
  }

  let permissions : ChatPermissions = {
    [`${eventId}`]: ["history"], 
    [`${eventId}-pinned`]: ["history"]
  };

  switch(role) {
    case "admin":
      permissions = {
        [`${eventId}`]: ["history", "subscribe", "publish"], 
        [`${eventId}-pinned`]: ["history", "subscribe", "publish"]
      };
      break;
    case "attendee":
      permissions = {
        [`${eventId}`]: ["history", "subscribe", "publish"], 
        [`${eventId}-pinned`]: ["history", "subscribe"]
      };
      break;
  }

  return permissions;
} 
