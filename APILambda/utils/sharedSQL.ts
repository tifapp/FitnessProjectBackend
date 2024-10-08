import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"

export const isUserInEvent = (
  conn: MySQLExecutableDriver,
  userId: string,
  eventId: number
) =>
  conn
    .queryHasResults(
      "SELECT TRUE FROM eventAttendance WHERE userId = :userId AND eventId = :eventId;",
      { userId, eventId }
    )
    .withFailure("user-not-attendee" as const)

export const isUserBlocked = (
  conn: MySQLExecutableDriver,
  fromUserId: string,
  toUserId: string
) =>
  conn
    .queryHasResults(
      "SELECT TRUE FROM userRelationships WHERE fromUserId = :fromUserId AND toUserId = :toUserId AND (status IS NOT NULL AND status = 'blocked');",
      { fromUserId, toUserId }
    )

export const addUserToEventAttendance = (userId: string, eventId: number) =>
  conn.queryResult(
    `
    INSERT INTO eventAttendance (userId, eventId)
    VALUES (:userId, :eventId)
    `,
    { userId, eventId }
  )
