import { MySQLExecutableDriver } from "../../LocalSQL/MySQLDriver.js"
import { conn, createDatabaseConnection } from "../../LocalSQL/dbConnection.js"

export type ExecuteResult = {
  id: string
  affectedRows: number
}

describe("MySQLExecutableDriver", () => {
  beforeAll(async () => {
    const createMySQLDriverTableSQL = `
    CREATE TABLE IF NOT EXISTS mySQLDriver (
    id bigint NOT NULL,
    name varchar(50) NOT NULL,
    PRIMARY KEY (id)
    )`
    await conn.transaction(
      async (tx) => await tx.executeResult(createMySQLDriverTableSQL)
    )
  })

  afterAll(async () => {
    const deleteMySQLDriverTableSQL = `
    DROP TABLE IF EXISTS MySQLDriver
    `
    await conn.transaction(
      async (tx) => await tx.executeResult(deleteMySQLDriverTableSQL)
    )
  })

  describe("execute", () => {
    it("should execute a query and return the result", async () => {
      const mySQLDriverTest = new MySQLExecutableDriver(createDatabaseConnection())
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "INSERT INTO MySQLDriver (name, id) VALUES ('Surya',0)"
      const result = await mySQLDriverTest.execute(query)
      expect(result).toEqual({
        affectedRows: 1,
        insertId: "0"
      })
      await mySQLDriverTest.closeConnection()
    })

    it("should throw an error if execution does not return a ResultSetHeader", async () => {
      const mySQLDriverTest = new MySQLExecutableDriver(createDatabaseConnection())
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "SELECT * FROM MySQLDriver"
      const args = null
      await expect(mySQLDriverTest.execute(query, args)).rejects.toThrow(
        "Execution did not return a ResultSetHeader."
      )
      await mySQLDriverTest.closeConnection()
    })
  })

  describe("transaction", () => {
    it("should perform a transaction and return the result", async () => {
      const mySQLDriverTest = new MySQLExecutableDriver(createDatabaseConnection())
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "INSERT INTO MySQLDriver (name, id) VALUES ('Bob',0)"
      const args = null
      const result = await mySQLDriverTest.transaction((tx) =>
        tx.executeResult(query, args)
      )
      expect(result).toEqual({
        status: "success",
        value: {
          affectedRows: 1,
          insertId: "0"
        }
      })
      await mySQLDriverTest.closeConnection()
    })
    it("should rollback if an error occurs", async () => {
      const mySQLDriverTest = new MySQLExecutableDriver(createDatabaseConnection())
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "INSERT INTO MySQLDriver"
      const args = null
      expect(
        mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      ).rejects.toThrow(Error)
      await mySQLDriverTest.closeConnection()
    })
  })

  describe("query", () => {
    it("should execute a query and return the result rows", async () => {
      const mySQLDriverTest = new MySQLExecutableDriver(createDatabaseConnection())
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      let query = "INSERT INTO MySQLDriver (name, id) VALUES ('Bob', 0)"
      const args = null
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM MySQLDriver"
      const result = await mySQLDriverTest.query(query, args)
      expect(result).toEqual(
        [
          {
            id: 0,
            name: "Bob"
          }
        ]
      )
      await mySQLDriverTest.closeConnection()
    })
    it("should throw an error if query does not return an array of rows", async () => {
      const mySQLDriverTest = new MySQLExecutableDriver(createDatabaseConnection())
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "INSERT INTO MySQLDriver (name, id) VALUES ('Bob', 0)"
      const args = null
      await expect(mySQLDriverTest.query(query, args)).rejects.toThrowError("Query did not return an array of rows.")
      await mySQLDriverTest.closeConnection()
    })
  })

  describe("closeConnection", () => {
    it("should close the connection", async () => {
      const mySQLDriverTest = new MySQLExecutableDriver(createDatabaseConnection())
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      await mySQLDriverTest.closeConnection()
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Chungus',1)"
      await expect(mySQLDriverTest.execute(query)).rejects.toThrow("Can't add new command when connection is in closed state")
      await mySQLDriverTest.closeConnection()
    })
  })
})
