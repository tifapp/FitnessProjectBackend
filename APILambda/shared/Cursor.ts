import base64url from "base64url"
const defaultJoinDate = "1970-01-01T00:00:00Z"

/**
 * Encodes the cursor for the attendees list.
 *
 * @param cursorObject - An object with properties 'userId' (string) and 'joinDate' (Date).
 * @returns The encoded cursor combining userId and joinDate.
 */
export const encodeAttendeesListCursor = (cursorObject: {
  userId: string
  joinDate: Date
}): string => {
  const { userId, joinDate } = cursorObject
  const encodedJoinDate = joinDate ? joinDate.toISOString() : defaultJoinDate
  return base64url.encode(`${userId}|${encodedJoinDate}`)
}

/**
 * Decodes the cursor for the attendees list.
 *
 * @param cursor - The encoded cursor string.
 * @returns Decoded userId and joinDate.
 */
export const decodeAttendeesListCursor = (
  cursor: string
): { userId: string; joinDate: Date } => {
  const [encodedUserId, encodedJoinDate] = base64url.decode(cursor).split("|")
  let joinDate = new Date(defaultJoinDate)
  if (encodedJoinDate !== defaultJoinDate) {
    joinDate = new Date(encodedJoinDate)
  }
  return { userId: encodedUserId, joinDate }
}
