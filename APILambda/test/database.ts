import { fail } from "assert";
import { conn } from "../dbconnection.js";

const resetDB = async () => {
  await conn.transaction(async (tx) => {
    await tx.execute("DELETE FROM user");
    await tx.execute("DELETE FROM Event");
    await tx.execute("DELETE FROM userRelations");
    await tx.execute("DELETE FROM userSettings");
  });
};

/**
 * Resets the database in-between each test.
 */
export const resetDatabaseBeforeEach = () => {
  beforeEach(async () => await resetDB());
};

/**
 * A helper function for validating a check constraint failure.
 */
export const expectFailsCheckConstraint = async (fn: () => Promise<void>) => {
  try {
    await fn();
    fail("This function should throw a check constraint error.");
  } catch (err: any) {
    expect(err.body.message.includes("(errno 3819)"));
  }
};
