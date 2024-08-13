import sqlts, { Config } from "@rmp135/sql-ts"
import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { envVars } from "../TiFBackendUtils/env.js"
import { generateMarkdownTable } from "./utils/generateMarkdownTable.js"
import { getTableNames } from "./utils/getTableNames.js"

const options = {
  schemaOutput: "../schema.md",
  typesOutput: "../TiFBackendUtils/Types/entities.ts",
  optionalValueUndefined: true,
  assignColumnType: {
    hostHandle: "import(\"../../node_modules/TiFShared/domain-models/User.js\").UserHandle",
    handle: "import(\"../../node_modules/TiFShared/domain-models/User.js\").UserHandle",
    color: "import(\"../../node_modules/TiFShared/domain-models/ColorString.js\").ColorString",
    hasArrived: "boolean",
    pushNotificationTriggerIds: "import(\"../../node_modules/TiFShared/domain-models/Settings.js\").UserSettings[\"pushNotificationTriggerIds\"]"
  },
  typeMap: {
    boolean: ["tinyint"],
    number: ["bigint"]
  }
}

if (process.argv.includes("--run")) {
  const sqltsConfig: Config = {
    client: "mysql2",
    connection: {
      host: envVars.DATABASE_HOST,
      user: envVars.DATABASE_USERNAME,
      password: envVars.DATABASE_PASSWORD,
      database: envVars.DATABASE_NAME
    },
    typeMap: options.typeMap,
    globalOptionality: "required" as const,
    // eslint-disable-next-line no-template-curly-in-string
    interfaceNameFormat: "DB${table}"
  }

  const DB = await sqlts.toObject(sqltsConfig)

  const tableNames = await getTableNames()

  const TiFDBTables = DB.tables.filter(table => tableNames.includes(`${table.interfaceName}`))

  if (options.assignColumnType) {
    TiFDBTables.forEach(table => {
      table.columns.forEach(column => {
        if (options.assignColumnType[column.name]) {
          column.propertyType = options.assignColumnType[column.name]
        }
      })
    })
  }

  let tsString = await sqlts.fromObject({ tables: TiFDBTables, enums: DB.enums }, sqltsConfig)

  if (options.optionalValueUndefined) {
    tsString = tsString.replace(/ null/g, " undefined")
  }

  (async () => {
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url))

      await Promise.all([
        fs.writeFile(path.join(__dirname, options.schemaOutput),
          TiFDBTables.map(table =>
            `### ${table.name}\n${generateMarkdownTable(table.columns.map(
              ({ propertyName: Property, propertyType: Type, nullable: Optional, defaultValue: DefaultValue }) =>
                ({ Property, Type, Optional, DefaultValue })
            ))}`
          ).join("\n")),
        fs.writeFile(path.join(__dirname, options.typesOutput), tsString)
      ])

      console.log("Schema generated successfully")
      console.log("Entities generated successfully")
    } catch (err) {
      console.error("Error saving files:", err)
    }
  })()
}
