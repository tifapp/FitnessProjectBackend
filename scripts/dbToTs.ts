import sqlts from "@rmp135/sql-ts"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { conn } from "../TiFBackendUtils/SQLExecutable/index.js"

if (process.argv.includes('--run')) {
  dotenv.config()

  const config = {
    client: "mysql2",
    connection: {
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.ENVIRONMENT,
      ssl: {
        rejectUnauthorized: false
      }
    },
    typeMap: {
      boolean: ["tinyint"],
      number: ["bigint"]
    },
    typeOverrides: {
      [`${process.env.ENVIRONMENT}.TifEventView.hasArrived`]: "boolean" as const
    },
    columnOptionality: {
      [`${process.env.ENVIRONMENT}.TifEventView.hasArrived`]: "required" as const
    },
    globalOptionality: "required" as const,
    // eslint-disable-next-line no-template-curly-in-string
    interfaceNameFormat: "DB${table}"
  }
  
  const tablesColumn = `Tables_in_${process.env.ENVIRONMENT}`
  
  const tableNames = (await conn.queryResult<{
    tablesColumn: string
  }>("SHOW TABLES;")).value.map(name => `DB${name[tablesColumn]}`)
  
  const DB = await sqlts.toObject(config)
  const TiFDBTables = DB.tables.filter(table => tableNames.includes(`${table.interfaceName}`))
  
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  
  const tsString = await sqlts.fromObject({ tables: TiFDBTables, enums: DB.enums }, config)
  
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
        reject(err);
      } else {
        resolve();
      }
    });
  });
  
  (async () => {
    try {
      const schemaPath = path.join(__dirname, "../schema.md");
      const entitiesPath = path.join(__dirname, "../entities.ts");
  
      await Promise.all([
        writeFilePromise(schemaPath, markdownTables),
        writeFilePromise(entitiesPath, tsString)
      ]);
  
      console.log("Schema generated successfully");
      console.log("Entities generated successfully");
    } catch (err) {
      console.error("Error saving files:", err);
    } finally {
      conn.closeConnection();
    }
  })();
}