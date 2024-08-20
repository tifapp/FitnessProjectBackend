import { MySQLDriver } from "../../MySQLDriver/MySQLDriver.js"

export type ExecuteResult = {
  id: string
  rowsAffected: number
}

describe("MySQLDriver", () => {
  let mySQLDriverTest: MySQLDriver

  beforeAll(async () => {
    mySQLDriverTest = new MySQLDriver()
    const createMySQLDriverTableSQL = `
    CREATE TABLE IF NOT EXISTS mySQLDriver (
    id bigint NOT NULL,
    name varchar(50) NOT NULL,
    PRIMARY KEY (id)
    )`
    await mySQLDriverTest.executeResult(createMySQLDriverTableSQL)
  })

  afterAll(async () => {
    await mySQLDriverTest.closeConnection()
    const deleteMySQLDriverTableSQL = `
    DROP TABLE IF EXISTS mySQLDriver
    `
    mySQLDriverTest = new MySQLDriver()
    await mySQLDriverTest.executeResult(deleteMySQLDriverTableSQL)
    await mySQLDriverTest.closeConnection()
  })

  describe("executeResult", () => {
    it("should execute a query and return the result", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Surya',0)"
      const result = await mySQLDriverTest.executeResult(query)
      expect(result.value).toEqual({
        rowsAffected: 1,
        insertId: "0"
      })
    })

    it("should execute a query with undefined values", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      const query = "INSERT INTO mySQLDriver (name, id) VALUES (:name, :id)"
      const result = await mySQLDriverTest.executeResult(query, { name: undefined, id: 0 })
      expect(result.value).toEqual({
        rowsAffected: 1,
        insertId: "0"
      })
    })

    it("should throw an error if execute is used with a read statement", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      const query = "SELECT * FROM mySQLDriver"
      const args = null
      await expect(mySQLDriverTest.executeResult(query, args)).rejects.toThrow(
        "Execution did not return a ResultSetHeader."
      )
    })
  })

  describe("transaction", () => {
    it("should perform a transaction and return the result", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Bob',0)"
      const args = null
      const result = await mySQLDriverTest.transaction((tx) =>
        tx.executeResult(query, args)
      )
      expect(result).toEqual({
        status: "success",
        value: {
          rowsAffected: 1,
          insertId: "0"
        }
      })
    })
    it("should rollback if an error occurs", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      const query = "INSERT INTO mySQLDriver"
      const args = null
      expect(
        mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      ).rejects.toThrow(Error)
    })
  })

  describe("queryResult", () => {
    it("should execute a query and return the result rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      let query = "INSERT INTO mySQLDriver (name, id) VALUES ('Bob', 0)"
      const args = null
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM mySQLDriver"
      const result = await mySQLDriverTest.queryResult(query, args)
      expect(result.value).toEqual(
        [
          {
            id: 0,
            name: "Bob"
          }
        ]
      )
    })

    it("should convert nullrows from results to undefined", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      let query = "INSERT INTO mySQLDriver (name, id) VALUES (null, 0)"
      const args = null
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM mySQLDriver"
      const result = await mySQLDriverTest.queryResult(query, args) // check if we can convert data using custom primitive and parse?
      expect(result.value).toEqual(
        [
          {
            id: 0,
            name: undefined
          }
        ]
      )
    })

    it("should convert null rows from results to undefined", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      let query = "INSERT INTO mySQLDriver (name, id) VALUES (null, 0)"
      const args = null
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM mySQLDriver"
      const result = await mySQLDriverTest.queryResult(query, args)
      expect(result.value).toEqual(
        [
          {
            id: 0,
            name: undefined
          }
        ]
      )
    })

    it("should throw an error if query is used with a write statement", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Bob', 0)"
      const args = null
      await expect(mySQLDriverTest.queryResult(query, args)).rejects.toThrowError("Query did not return an array of rows and fields.")
    })
  })

  describe("queryFirstResult", () => {
    it("should execute a query and return the result rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      let query = "INSERT INTO mySQLDriver (name, id) VALUES ('Bob', 0)"
      const args = null
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM mySQLDriver"
      const result = await mySQLDriverTest.queryFirstResult(query, args)
      expect(result.value).toEqual(
        {
          id: 0,
          name: "Bob"
        }
      )
    })

    it("should throw an error if query returns no rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      const query = "SELECT * FROM mySQLDriver"
      const args = null
      const result = await mySQLDriverTest.queryFirstResult(query, args)
      expect(result.status).toEqual("failure")
    })
  })

  describe("queryHasResults", () => {
    it("should execute a query and return the result rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      let query = "INSERT INTO mySQLDriver (name, id) VALUES ('Bob', 0)"
      const args = null
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM mySQLDriver"
      const result = await mySQLDriverTest.queryHasResults(query, args)
      expect(result.value).toEqual(true)
    })

    it("should throw an error if query returns no rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      const query = "SELECT * FROM mySQLDriver"
      const args = null
      const result = await mySQLDriverTest.queryHasResults(query, args)
      expect(result.status).toEqual("failure")
    })
  })

  describe("closeConnection", () => {
    it("should close the connection", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mySQLDriver")
      await mySQLDriverTest.closeConnection()
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Chungus',1)"
      await expect(mySQLDriverTest.executeResult(query)).rejects.toThrow("Current connection instance was ended.")
    })
  })
})
