import { afterEach } from "node:test"
import { LocalMySQLExecutableDriver } from "../../LocalSQL/LocalMySQLDriver.js"
import { sqlConn } from "../../LocalSQL/index.js"
import { conn } from "../index.js"

export type ExecuteResult = {
  id: string
  affectedRows: number
}

describe("LocalMySQLExecutableDriver", () => {
  let mySQLDriverTest: LocalMySQLExecutableDriver

  beforeAll(async () => {
    mySQLDriverTest = conn
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

  afterEach(async () => {
    mySQLDriverTest.execute("DELETE FROM mySQLDriver")
  })

  afterAll(async () => {
    const deleteMySQLDriverTableSQL = `
    DROP TABLE IF EXISTS MySQLDriver
    `
    await conn.transaction(
      async (tx) => await tx.executeResult(deleteMySQLDriverTableSQL)
    )
    // await mySQLDriverTest.closeConnection()
  })

  describe("execute", () => {
    it("should execute a query and return the result", async () => {
      const query = "INSERT INTO MySQLDriver (name, id) VALUES ('Surya', 0)"
      const result = await mySQLDriverTest.execute(query)
      expect(result).toEqual({
        affectedRows: 1,
        insertId: "0"
      })
    })

    it("should throw an error if execution does not return a ResultSetHeader", async () => {
      const query = "SELECT * FROM MySQLDriver"
      const args = null
      await expect(mySQLDriverTest.execute(query, args)).rejects.toThrow(
        "Execution did not return a ResultSetHeader."
      )
    })
  })

  describe("transaction", () => {
    it("should perform a transaction and return the result", async () => {
      const query = "INSERT INTO MySQLDriver (name, id) VALUES ('Bob',1)"
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
    })
    it("should rollback if an error occurs", async () => {
      const query = "INSERT INTO MySQLDriver"
      const args = null
      // const result = await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      jest.spyOn(mySQLDriverTest, "executeResult")
      expect(
        mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      ).rejects.toThrow(Error)
      expect(mySQLDriverTest.executeResult).toBeCalled()
      const transactionSQLConn = await sqlConn
      jest.spyOn(transactionSQLConn, "rollback")
      expect(transactionSQLConn.rollback).toBeCalled()
    })
  })

  describe("query", () => {
    it("should execute a query and return the result rows", async () => {
      let query = "INSERT INTO MySQLDriver (name, id) VALUES ('Bob', 2)"
      const args = null
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM MySQLDriver"
      const result = await mySQLDriverTest.query(query, args)
      expect(result).toEqual(
        [
          {
            id: 0,
            name: "Surya"
          },
          {
            id: 1,
            name: "Bob"
          }
        ]
      )
    })
    it("should throw an error if query does not return an array of rows", async () => {
      const query = "INSERT INTO MySQLDriver (name, id) VALUES ('Bob', 3)"
      const args = null
      await expect(mySQLDriverTest.query(query, args)).rejects.toThrowError("Query did not return an array of rows.")
    })
  })

  describe("closeConnection", () => {
    it.only("should close the connection", async () => {
      await mySQLDriverTest.closeConnection()
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Chungus',4)"
      await expect(mySQLDriverTest.execute(query)).rejects.toThrowError("Can't add new command when connection is in closed state")
    })
  })
})
