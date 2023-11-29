import { Placemark, SQLExecutable, conn } from "TiFBackendUtils"

export const isUserInEvent = (
  conn: SQLExecutable,
  userId: string,
  eventId: number
) =>
  conn
    .queryHasResults(
      "SELECT TRUE FROM eventAttendance WHERE userId = :userId AND eventId = :eventId;",
      { userId, eventId }
    )
    .withFailure("user-not-attendee" as const)

export const isUserNotBlocked = (
  conn: SQLExecutable,
  fromUserId: string,
  toUserId: string
) =>
  conn
    .queryHasResults(
      "SELECT TRUE FROM userRelations WHERE fromUserId = :fromUserId AND toUserId = :toUserId AND status = 'blocked';",
      { fromUserId, toUserId }
    )
    .inverted()
    .withFailure("user-is-blocked" as const)

export const addPlacemarkToDB = (place: Placemark) =>
  conn.queryResults(
    `
    INSERT INTO location (name, city, country, street, street_num, lat, lon)
    VALUES (:name, :city, :country, :street, :street_num, :lat, :lon)
    `,
    place
  )
