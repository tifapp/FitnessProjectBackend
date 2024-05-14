import sqlts from "@rmp135/sql-ts"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
// dev use only
// eslint-disable-next-line import/extensions
import { conn } from "./SQLExecutable/index.js"

dotenv.config()

const config = {
  client: "mysql2",
  connection: {
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: "tif",
    ssl: {
      rejectUnauthorized: false
    }
  },
  typeMap: {
    boolean: ["tinyint"],
    number: ["bigint"]
  },
  typeOverrides: {
    "tif.TifEventView.hasArrived": "boolean" as const
  },
  columnOptionality: {
    "tif.TifEventView.hasArrived": "required" as const
  },
  globalOptionality: "required" as const,
  // eslint-disable-next-line no-template-curly-in-string
  interfaceNameFormat: "DB${table}"
}

const tableNames = (await conn.queryResults<{
  "Tables_in_tif": string
}>("SHOW TABLES;")).value.map(name => `DB${name.Tables_in_tif}`)

const DB = await sqlts.toObject(config)
const TiFDBTables = DB.tables.filter(table => tableNames.includes(`${table.interfaceName}`))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const filePath = path.join(__dirname, "./entities.ts")

const tsString = await sqlts.fromObject({ tables: TiFDBTables, enums: DB.enums }, config)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateMarkdownTable = (data: any[]):string => {
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
fs.writeFileSync("../schema.md", markdownTables)

fs.writeFile(filePath, tsString, (err) => {
  if (err) {
    console.error("Error saving schema:", err)
  } else {
    console.log("Schema generated successfully")
  }
  conn.closeConnection()
})
