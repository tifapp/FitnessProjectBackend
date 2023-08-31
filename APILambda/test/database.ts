import { fail } from "assert"
import { conn } from "../dbconnection.js"

const resetDB = async () => {
  await Promise.all([conn.execute("DELETE FROM user"), conn.execute("DELETE FROM event"), conn.execute("DELETE FROM userRelations"), conn.execute("DELETE FROM userSettings")])
}

/**
 * Resets the database in-between each test.
 */
export const resetDatabaseBeforeEach = () => {
  beforeEach(async () => await resetDB())
}

/**
 * A helper function for validating a check constraint failure.
 */
export const expectFailsCheckConstraint = async (fn: () => Promise<void>) => {
  try {
    await fn()
    fail("This function should throw a check constraint error.")
  } catch (err: any) {
    expect(err.body.message.includes("(errno 3819)"))
  }
}
