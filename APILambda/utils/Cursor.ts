/**
 * Encodes the cursor for the attendees list using Buffer.
 *
 * @param cursorObject - An object with properties 'userId' (string) and 'joinedDateTime' (Date).
 * @returns The encoded cursor combining userId and joinedDateTime.
 */
export const encodeAttendeesListCursor = ({
  userId = "firstPage",
  joinedDateTime,
  arrivedDateTime
}: {
  userId: string
  joinedDateTime?: Date
  arrivedDateTime?: Date
}): string =>
  Buffer.from(
    `${userId}|${joinedDateTime?.toISOString()}|${arrivedDateTime?.toISOString()}`
  ).toString("base64")

export type AttendeesListCursor = {
  userId: string
  joinedDateTime?: Date
  arrivedDateTime?: Date
}

/**
 * Decodes the cursor for the attendees list using Buffer.
 *
 * @param cursor - The encoded cursor string.
 * @returns Decoded userId and joinedDateTime.
 */
export const decodeAttendeesListCursor = (
  cursor: string | undefined
): AttendeesListCursor => {
  if (cursor === undefined) {
    return { userId: "firstPage", joinedDateTime: undefined }
  }

  const decodedString = Buffer.from(cursor, "base64").toString("utf-8")
  const [decodedUserId, decodedJoinDate, decodedArrivedDateTime] =
    decodedString.split("|")

  if (decodedUserId === "lastPage") {
    return { userId: "lastPage" }
  }
  const joinedDateTime = decodedJoinDate ? new Date(decodedJoinDate) : undefined
  const arrivedDateTime =
    decodedArrivedDateTime !== "undefined"
      ? new Date(decodedArrivedDateTime)
      : undefined

  return { userId: decodedUserId, joinedDateTime, arrivedDateTime }
}
