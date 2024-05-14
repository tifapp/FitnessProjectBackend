import { conn } from "TiFBackendUtils"
import { fail } from "assert"

export const resetDB = async () => {
  await Promise.allSettled([
    conn.executeResult("DELETE FROM eventAttendance"),
    conn.executeResult("DELETE FROM location"),
    conn.executeResult("DELETE FROM pushTokens"),
    conn.executeResult("DELETE FROM userRelations"),
    conn.executeResult("DELETE FROM userSettings"),
    conn.executeResult("DELETE FROM userArrivals"),
    conn.executeResult("DELETE FROM location")
  ])
  await conn.executeResult("DELETE FROM event")
  await conn.executeResult("DELETE FROM user")
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
    console.log("error is ", err)
    expect(err.message.includes("Check constraint")) // should be more generic
  }
}
