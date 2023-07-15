import {
  SQLExecutable,
  selectLastInsertionNumericId
} from "../dbconnection.js";
import { ServerEnvironment } from "../env.js";
import { userNotFoundBody, userWithIdExists } from "../user/index.js";
import { Result } from "../utils.js";
import { insertEvent } from "./SQLStatements.js";
import { CreateEventInput } from "./models.js";

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

export const createTokenRequestWithPermissionsTransaction = async (conn: SQLExecutable, eventId: number, userId: string): Promise<
Result<{ id: string }, "user-already-exists" | "duplicate-handle" | "extra-error">
> => {  
  //return await
    /*
    const eventDetails = await conn.transaction(async (tx) => {
      const event = await getEvent(tx, eventId); //reads Event table
      //if event does not exist return 'event-not-found'

      const userInEvent = await checkIfUserInEvent(tx, eventId); //reads eventAttendance table
      //if user is not apart of event return 'user-not-in-event'

      const isUserBlocked = await checkIfUserBlocked(tx, eventId); //reads userRelation table
      //if user is blocked by event host return 'user-blocked'

      return event.rows[0]
    });
    */

    //const role = //util function that, given an event + userId, returns a users role that corresponds to their permissions in the channel
      //roles: "admin" | "attendee" | "viewer"    
      //  if event has ended, return "viewer" role
      //  else if userId matches ownerId, return "admin" role
      //  else return "attendee" role

    //const permissions = //util function to generate capabilities given channel id and user's role
      //https://ably.com/docs/auth/capabilities#capability-operations
      //admins capabilities look like: {
      //  tifapp:eventId: ["history", "subscribe", "publish"]
      //  tifapp:eventId-pinned: ["history", "subscribe", "publish"]
      //}
      //attendees capabilities look like: {
      //  tifapp:eventId: ["history", "subscribe", "publish"]
      //  tifapp:eventId-pinned: ["history", "subscribe"]
      //}
      //viewers capabilities look like: {
      //  tifapp:eventId: ["history"]
      //  tifapp:eventId-pinned: ["history"]
      //}

    //try
      //const tokenRequest = createTokenRequest(permissions, userid)
      //if success, return {status: 'success', value: tokenRequest}
    //catch
      //if fails, return {status: 'error', value: 'cannot-generate-token'}

  return {status: "error", value: "duplicate-handle"}
}