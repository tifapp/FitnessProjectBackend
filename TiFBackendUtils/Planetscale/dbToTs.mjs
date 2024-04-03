import sqlts from "@rmp135/sql-ts"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

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
    "tif.TifEventView.hasArrived": "boolean"
  },
  columnOptionality: {
    "tif.TifEventView.hasArrived": "required"
  },
  globalOptionality: "required",
  // eslint-disable-next-line no-template-curly-in-string
  interfaceNameFormat: "DB${table}"
}

console.log(JSON.stringify(await sqlts.toObject(config), null, 2))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const filePath = path.join(__dirname, "./entities.ts")

const tsString = await sqlts.toTypeScript(config)
fs.writeFile(filePath, tsString, (err) => {
  if (err) {
    console.error("Error saving schema:", err)
  } else {
    console.log("Schema generated successfully")
  }
})
