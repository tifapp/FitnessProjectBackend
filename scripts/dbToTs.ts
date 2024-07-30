import sqlts, { Config } from "@rmp135/sql-ts"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { conn, envVars } from "../TiFBackendUtils/index.js"

const options = {
  schemaOutput: "../schema.md",
  typesOutput: "../TiFBackendUtils/entities.ts",
  optionalValueUndefined: true,
  overwriteColumnType: {
    hostHandle: "import(\"../../TiFShared/domain-models/User.js\").UserHandle",
    handle: "import(\"../../TiFShared/domain-models/User.js\").UserHandle",
    hasArrived: "boolean",
    pushNotificationTriggerIds: "import(\"../../TiFShared/domain-models/Settings.js\").UserSettings[\"pushNotificationTriggerIds\"]",
    color: "import(\"../../TiFShared/domain-models/ColorString.js\").ColorString"
  }
}

if (process.argv.includes("--run")) {
  const config: Config = {
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
    globalOptionality: "required" as const,
    // eslint-disable-next-line no-template-curly-in-string
    interfaceNameFormat: "DB${table}"
  }

  const DB = await sqlts.toObject(config)

  const tableNames = (await conn.queryResult<{
    tablesColumn: string
  }>("SHOW TABLES;")).value.map(name => `DB${name[`Tables_in_${envVars.DATABASE_NAME}`]}`)

  const TiFDBTables = DB.tables.filter(table => tableNames.includes(`${table.interfaceName}`))

  if (options.overwriteColumnType) {
    DB.tables.forEach(table => {
      table.columns.forEach(column => {
        if (options.overwriteColumnType[column.name]) {
          column.propertyType = options.overwriteColumnType[column.name]
        }
      })
    })
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  let tsString = await sqlts.fromObject({ tables: TiFDBTables, enums: DB.enums }, config)

  if (options.optionalValueUndefined) {
    tsString = tsString.replace(/ null/g, " undefined")
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

  const markdownTables = generateMarkdownTable(TiFDBTables)

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
      const schemaPath = path.join(__dirname, options.schemaOutput)
      const entitiesPath = path.join(__dirname, options.typesOutput)

      await Promise.all([
        writeFilePromise(schemaPath, markdownTables),
        writeFilePromise(entitiesPath, tsString)
      ])

      console.log("Schema generated successfully")
      console.log("Entities generated successfully")
    } catch (err) {
      console.error("Error saving files:", err)
    } finally {
      conn.closeConnection()
    }
  })()
}
