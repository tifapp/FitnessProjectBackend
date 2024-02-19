const defaultJoinDate = "1970-01-01T00:00:00Z"

/**
 * Encodes the cursor for the attendees list using Buffer.
 *
 * @param cursorObject - An object with properties 'userId' (string) and 'joinDate' (Date).
 * @returns The encoded cursor combining userId and joinDate.
 */
export const encodeAttendeesListCursor = (cursorObject?: {
  userId: string
  joinDate: Date | null
  arrivedAt: Date | null
}): string => {
  const { userId, joinDate, arrivedAt } = cursorObject ??
    {
      userId: "firstPage",
      joinDate: null,
      arrivedAt: null
    }

  const joinDateToEncode = joinDate ?? defaultJoinDate
  const encodedCursor = Buffer.from(
    `${userId}|${joinDateToEncode}|${arrivedAt}`
  ).toString("base64")
  return encodedCursor
}

/**
 * Decodes the cursor for the attendees list using Buffer.
 *
 * @param cursor - The encoded cursor string.
 * @returns Decoded userId and joinDate.
 */
export const decodeAttendeesListCursor = (
  cursor: string | undefined
): { userId: string; joinDate: Date | null; arrivedAt: Date | null } => {
  let joinDate = new Date(defaultJoinDate)
  let arrivedAt = null

  if (cursor === undefined) {
    return { userId: "firstPage", joinDate, arrivedAt: null }
  }

  const decodedString = Buffer.from(cursor, "base64").toString("utf-8")
  const [decodedUserId, decodedJoinDate, decodedArrivedAt] =
    decodedString.split("|")

  if (decodedUserId === "lastPage") {
    return { userId: "lastPage", joinDate: null, arrivedAt: null }
  }
  joinDate =
    decodedJoinDate !== defaultJoinDate ? new Date(decodedJoinDate) : joinDate
  arrivedAt = decodedArrivedAt !== "null" ? new Date(decodedArrivedAt) : null

  return { userId: decodedUserId, joinDate, arrivedAt }
}
