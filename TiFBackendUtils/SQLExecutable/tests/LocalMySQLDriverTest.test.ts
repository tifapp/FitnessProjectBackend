import mysql from "mysql2/promise.js"
import { z } from "zod"
import { LocalMySQLExecutableDriver } from "../../LocalSQL/LocalMySQLDriver.js"
import { Result } from "../../result.js"
import { ExecuteResult } from "../SQLDriverAbstract"

const EnvVarsSchema = z
  .object({
    DATABASE_HOST: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_USERNAME: z.string(),
    DATABASE_NAME: z.string()
  })
  .passthrough()

const envVars = EnvVarsSchema.parse(process.env)

async function createDatabaseConnection () {
  try {
    const connection = await mysql.createConnection({
      host: envVars.DATABASE_HOST,
      user: envVars.DATABASE_USERNAME,
      password: envVars.DATABASE_PASSWORD,
      database: envVars.DATABASE_NAME,
      namedPlaceholders: true
    })
    console.log("Successfully connected to the database.")
    return connection
  } catch (error) {
    console.error("Unable to connect to the database:", error)
    throw error
  }
}

describe("LocalMySQLExecutableDriver", () => {
  let mySQLDriver: LocalMySQLExecutableDriver

  beforeAll(async () => {
    mySQLDriver = new LocalMySQLExecutableDriver(createDatabaseConnection())
  })

  afterEach(async () => {
    mySQLDriver.execute("DELETE * FROM users")
  })

  afterAll(async () => {
    await mySQLDriver.closeConnection()
  })

  describe("execute", () => {
    it("should execute a query and return the result", async () => {
      const query = "INSERT INTO users (name) VALUES 'Surya'"
      const result: ExecuteResult = await mySQLDriver.execute(query)
      expect(result).toEqual({ insertId: z.number, rowsAffected: 1 })
    })

    it("should throw an error if execution does not return a ResultSetHeader", async () => {
      const query = "SELECT * FROM users"
      const args = null
      await expect(mySQLDriver.execute(query, args)).rejects.toThrow("Execution did not return a ResultSetHeader.")
    })
  })

  describe("transaction", () => {
    it("should perform a transaction and return the result", async () => {
      const query = "INSERT INTO users (name) VALUES 'Bob'"
      const args = null
      const result: Result<ExecuteResult, never> = await mySQLDriver.transaction((tx) => tx.executeResult(query, args))
      expect(result).toEqual({ insertId: z.number, rowsAffected: 1 })
    })

    it("should rollback if an error occurs", async () => {
      const query = "INSERT INTO users"
      const args = null
      const result: Result<ExecuteResult, never> = await mySQLDriver.transaction((tx) => tx.executeResult(query, args))
      expect(result).toThrowError()
    })
  })

  describe("query", () => {
    it("should execute a query and return the result rows", async () => {
      let query = "INSERT INTO users (name) VALUES 'Bob'"
      const args = null
      await mySQLDriver.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM users"
      const result = await mySQLDriver.query(query, args)
      expect(result).toEqual([{ id: z.number, name: "Bob" }])
    })

    it("should throw an error if query does not return an array of rows", async () => {
      const query = "SELECT * FROM users"
      const args = null

      await expect(mySQLDriver.query(query, args)).rejects.toThrow("Query did not return an array of rows.")
    })
  })

  describe("closeConnection", () => {
    it("should close the connection", async () => {
      const result = await mySQLDriver.closeConnection()

      expect(result).toEqual("Connection is closed")
    })
  })
})
