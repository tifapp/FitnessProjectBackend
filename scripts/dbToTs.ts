import sqlts from "@rmp135/sql-ts"
import fs from "fs"
import path from "path"
import { envVars } from "../TiFBackendUtils/env"
import { createDatabaseConnection } from "../TiFBackendUtils/MySQLDriver/dbConnection"
import { resetDB } from "../TiFBackendUtils/MySQLDriver/test/utils"

if (process.argv.includes("--run")) {
  const config = {
    client: "mysql2",
    connection: {
      host: envVars.DATABASE_HOST,
      user: envVars.DATABASE_USERNAME,
      password: envVars.DATABASE_PASSWORD,
      database: envVars.DATABASE_NAME,
      ssl: {
        rejectUnauthorized: false
      }
    },
    typeMap: {
      boolean: ["tinyint"],
      number: ["bigint"]
    },
    typeOverrides: {
      [`${envVars.DATABASE_NAME}.TifEventView.hasArrived`]: "boolean" as const
    },
    columnOptionality: {
      [`${envVars.DATABASE_NAME}.TifEventView.hasArrived`]: "required" as const
    },
    globalOptionality: "required" as const,
    // eslint-disable-next-line no-template-curly-in-string
    interfaceNameFormat: "DB${table}"
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateMarkdownTable = (data: any[]): string => {
    let markdownContent = ""

    data.forEach(table => {
      markdownContent += `### ${table.name}\n\n`
      markdownContent += "| Property | Data Type | Nullable | Default Value |\n"
      markdownContent += "|----------|-----------|----------|---------------|\n"

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      table.columns.forEach((column: any) => {
        markdownContent += `| ${column.propertyName} | ${column.propertyType} | ${column.nullable ? "Yes" : "No"} | ${column.defaultValue || "None"} |\n`
      })

      markdownContent += "\n"
    })

    return markdownContent
  }

  const writeFilePromise = (filePath, content) => new Promise<void>((resolve, reject) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  });

  (async () => {
    try {
      await resetDB()
      const DBconnection = await createDatabaseConnection()
      const tables = await DBconnection.query("SHOW TABLES;")
      // @ts-expect-error Only for development
      const tableNames = tables[0].map(name => `DB${name[`Tables_in_${envVars.DATABASE_NAME}`]}`)
      DBconnection.end()

      const DB = await sqlts.toObject(config)
      const TiFDBTables = DB.tables.filter(table => tableNames.includes(`${table.interfaceName}`))

      const tsString = await sqlts.fromObject({ tables: TiFDBTables, enums: DB.enums }, config)
      const markdownTables = generateMarkdownTable(TiFDBTables)

      const schemaPath = path.join(__dirname, "../schema.md")
      const entitiesPath = path.join(__dirname, "../TiFBackendUtils/entities.ts")

      await Promise.all([
        writeFilePromise(schemaPath, markdownTables),
        writeFilePromise(entitiesPath, tsString)
      ])

      console.log("Schema generated successfully")
      console.log("Entities generated successfully")
    } catch (err) {
      console.error("Error saving files:", err)
    }
  })()
}
