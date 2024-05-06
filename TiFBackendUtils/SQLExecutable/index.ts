import mysql from "mysql2/promise.js"
import { SQLExecutable } from "./utils.js"
export { SQLExecutable }

async function createDatabaseConnection () {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "tifDev",
      namedPlaceholders: true
    })
    console.log("Successfully connected to the database.")
    return connection
  } catch (error) {
    console.error("Unable to connect to the database:", error)
    throw error
  }
}

console.log("trying connection")
export const conn = new SQLExecutable(createDatabaseConnection())
