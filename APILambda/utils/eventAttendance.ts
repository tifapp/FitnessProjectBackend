import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"

export const addUserToAttendeeList = (
  conn: MySQLExecutableDriver,
  userId: string,
  eventId: number,
  role: string
) =>
  conn.executeResult(
    "INSERT IGNORE INTO eventAttendance (userId, eventId, role) VALUES (:userId, :eventId, :role)",
    { userId, eventId, role }
  )
