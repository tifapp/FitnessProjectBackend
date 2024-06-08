import { DATABASE_NAME, conn, createConnection, promiseResult, success, tableDefintionsByFamily } from "TiFBackendUtils";
import { fail } from "assert";

const recreateDatabase = async () => {
  const connection = await createConnection({database: undefined});

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${DATABASE_NAME}\``);
    await connection.query(`CREATE DATABASE \`${DATABASE_NAME}\``);

    console.log(`Reset the database ${DATABASE_NAME} successfully`);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await connection.end();
  }
};

export const resetDB = async () => {
  await recreateDatabase()
  await recreateTables()
}

export const recreateTables = async () => {
  await conn.transaction(async (tx) => {
    for (const family of tableDefintionsByFamily) {
      await Promise.allSettled(
        family.map(tableDefinition => tx.executeResult(tableDefinition))
      )
    }

    return promiseResult(success())
  })
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
    expect(err.message.includes("Check constraint")) // TODO: Could be moved to backend utils
  }
}
