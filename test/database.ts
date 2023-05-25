import { conn } from "../dbconnection";

const resetDB = async () => {
  await conn.transaction(async (tx) => {
    await tx.execute("DELETE FROM user");
    await tx.execute("DELETE FROM event");
  });
};

/**
 * Resets the database in-between each test.
 */
export const resetDatabaseBeforeEach = () => {
  beforeEach(async () => await resetDB());
};
