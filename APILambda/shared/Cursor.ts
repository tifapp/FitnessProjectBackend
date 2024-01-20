const defaultJoinDate = "1970-01-01T00:00:00Z"

/**
 * Encodes the cursor for the attendees list using Buffer.
 *
 * @param cursorObject - An object with properties 'userId' (string) and 'joinDate' (Date).
 * @returns The encoded cursor combining userId and joinDate.
 */
export const encodeAttendeesListCursor = (cursorObject?: {
  userId: string
  joinDate: Date
}): string => {
  const { userId, joinDate } = cursorObject
    ? cursorObject
    : {
        userId: "firstPage",
        joinDate: null
      }
  const encodedJoinDate = joinDate ? joinDate.toISOString() : defaultJoinDate
  const encodedString = Buffer.from(`${userId}|${encodedJoinDate}`).toString(
    "base64"
  )
  return encodedString
}

/**
 * Decodes the cursor for the attendees list using Buffer.
 *
 * @param cursor - The encoded cursor string.
 * @returns Decoded userId and joinDate.
 */
export const decodeAttendeesListCursor = (
  cursor: string | undefined
): { userId: string; joinDate: Date } => {
  let joinDate = new Date(defaultJoinDate)

  if (cursor === undefined) {
    return { userId: "firstPage", joinDate }
  }
  const decodedString = Buffer.from(cursor, "base64").toString("utf-8")
  const [decodedUserId, decodedJoinDate] = decodedString.split("|")
  if (decodedJoinDate !== defaultJoinDate) {
    joinDate = new Date(decodedJoinDate)
  }
  return { userId: decodedUserId, joinDate }
}
