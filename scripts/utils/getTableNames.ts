import { envVars } from "../../TiFBackendUtils/env"
import { createDatabaseConnection } from "../../TiFBackendUtils/MySQLDriver/dbConnection"

export const getTableNames = async () => {
  const DBconnection = await createDatabaseConnection()
  const tables = await DBconnection.query("SHOW TABLES;")
  // @ts-expect-error Only for development
  const tableNames = tables[0].map(
    (name) => `DB${name[`Tables_in_${envVars.DATABASE_NAME}`]}`
  )
  DBconnection.end()

  return tableNames
}
