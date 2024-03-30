const defaultJoinDate = "1970-01-01T00:00:00Z"

/**
 * Encodes the cursor for the attendees list using Buffer.
 *
 * @param cursorObject - An object with properties 'userId' (string) and 'joinedDateTime' (Date).
 * @returns The encoded cursor combining userId and joinedDateTime.
 */
export const encodeAttendeesListCursor = (cursorObject?: {
  userId: string
  joinedDateTime: Date | null
  arrivedDateTime: Date | null
}): string => {
  const { userId, joinedDateTime, arrivedDateTime } = cursorObject ??
    {
      userId: "firstPage",
      joinedDateTime: null,
      arrivedDateTime: null
    }

  const joinDateToEncode = joinedDateTime ?? defaultJoinDate
  const encodedCursor = Buffer.from(
    `${userId}|${joinDateToEncode}|${arrivedDateTime}`
  ).toString("base64")
  return encodedCursor
}

/**
 * Decodes the cursor for the attendees list using Buffer.
 *
 * @param cursor - The encoded cursor string.
 * @returns Decoded userId and joinedDateTime.
 */
export const decodeAttendeesListCursor = (
  cursor: string | undefined
): { userId: string; joinedDateTime: Date | null; arrivedDateTime: Date | null } => {
  let joinedDateTime = new Date(defaultJoinDate)
  let arrivedDateTime = null

  if (cursor === undefined) {
    return { userId: "firstPage", joinedDateTime, arrivedDateTime: null }
  }

  const decodedString = Buffer.from(cursor, "base64").toString("utf-8")
  const [decodedUserId, decodedJoinDate, decodedArrivedDateTime] =
    decodedString.split("|")

  if (decodedUserId === "lastPage") {
    return { userId: "lastPage", joinedDateTime: null, arrivedDateTime: null }
  }
  joinedDateTime =
    decodedJoinDate !== defaultJoinDate ? new Date(decodedJoinDate) : joinedDateTime
  arrivedDateTime = decodedArrivedDateTime !== "null" ? new Date(decodedArrivedDateTime) : null

  return { userId: decodedUserId, joinedDateTime, arrivedDateTime }
}
