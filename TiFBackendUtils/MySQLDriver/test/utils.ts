import { envVars } from "../../env"
import { createDatabaseConnection } from "../dbConnection"
import { tableDefintionsByFamily } from "./tableDefinitions"

const recreateDatabase = async () => {
  const connection = await createDatabaseConnection({ database: undefined })

  try {
    // Need to interpolate the database name when using DDL statements like DROP DATABASE or CREATE DATABASE.
    await connection.query(`DROP DATABASE IF EXISTS \`${envVars.DATABASE_NAME}\``)
    await connection.query(`CREATE DATABASE \`${envVars.DATABASE_NAME}\``)

    console.log(`Reset the database ${envVars.DATABASE_NAME} successfully`)
  } catch (error) {
    console.error("An error occurred:", error)
  } finally {
    await connection.end()
  }
}

const recreateTables = async () => {
  const connection = await createDatabaseConnection({ database: envVars.DATABASE_NAME })

  for (const family of tableDefintionsByFamily) {
    try {
      const results = await Promise.allSettled(
        family.map(tableDefinition => connection.execute(tableDefinition))
      )

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Error creating table: ${family[index]}`, result.reason);
        }
      })
    } catch (error) {
      console.error("Unexpected error:", error)
    }
  }

  await connection.end()
}

export const resetDB = async () => {
  await recreateDatabase()
  await recreateTables()
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
