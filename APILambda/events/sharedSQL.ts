import { SQLExecutable } from "TiFBackendUtils"

export const isUserInEvent = (conn: SQLExecutable, userId: string, eventId: number) => conn.queryHasResults(
  "SELECT TRUE FROM eventAttendance WHERE userId = :userId AND eventId = :eventId;",
  { userId, eventId }
)
  .withFailure("user-not-attendee" as const)

export const isUserNotBlocked = (conn: SQLExecutable, fromUserId: string, toUserId: string) => conn.queryHasResults(
  "SELECT TRUE FROM userRelations WHERE fromUserId = :fromUserId AND toUserId = :toUserId AND status = 'blocked';",
  { fromUserId, toUserId }
)
  .inverted()
  .withFailure("user-is-blocked" as const)
