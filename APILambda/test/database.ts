import { conn } from "TiFBackendUtils"
import { fail } from "assert"

export const resetDB = async () => {
  await Promise.all([
    conn.queryResults("DELETE FROM eventAttendance"),
    conn.queryResults("DELETE FROM pushTokens"),
    conn.queryResults("DELETE FROM userRelations"),
    conn.queryResults("DELETE FROM userSettings"),
    conn.queryResults("DELETE FROM userArrivals")
  ])
  await conn.queryResults("DELETE FROM event")
  conn.queryResults("DELETE FROM user")
}

/**
 * A helper function for validating a check constraint failure.
 */
export const expectFailsCheckConstraint = async (fn: () => Promise<void>) => {
  try {
    await fn()
    fail("This function should throw a check constraint error.")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    expect(err.body.message.includes("(errno 3819)"))
  }
}
