import "TiFShared/lib/Zod"

import { MySQLDriver } from "../MySQLDriver"

describe("MySQLDriver", () => {
  let mySQLDriverTest: MySQLDriver

  beforeAll(async () => {
    mySQLDriverTest = new MySQLDriver()
    await mySQLDriverTest.executeResult(`
    CREATE TABLE IF NOT EXISTS mockTable (
      id bigint NOT NULL,
      name varchar(50),  
      isActive TINYINT(1),             
      createdAt TIMESTAMP,               
      updatedAt DATETIME,               
      price DECIMAL(10, 2),             
      data JSON,                   
      PRIMARY KEY (id)
    )`)
  })

  afterAll(async () => {
    await mySQLDriverTest.closeConnection()
    mySQLDriverTest = new MySQLDriver()
    await mySQLDriverTest.executeResult("DROP TABLE IF EXISTS mockTable")
    await mySQLDriverTest.closeConnection()
  })

  describe("executeResult", () => {
    it("should execute a query and return the result", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const query = "INSERT INTO mockTable (name, id) VALUES (:name, :id)"
      const result = await mySQLDriverTest.executeResult(query, { name: "Surya", id: 0 })
      expect(result.value).toEqual({
        rowsAffected: 1,
        insertId: "0"
      })
    })

    it("should execute a query with undefined values", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const query = "INSERT INTO mockTable (name, id) VALUES (:name, :id)"
      const result = await mySQLDriverTest.executeResult(query, { name: undefined, id: 0 })
      expect(result.value).toEqual({
        rowsAffected: 1,
        insertId: "0"
      })
    })

    it("should throw an error if execute is used with a read statement", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const query = "SELECT * FROM mockTable"
      await expect(mySQLDriverTest.executeResult(query)).rejects.toThrow(
        "Execution did not return a ResultSetHeader."
      )
    })
  })

  describe("transaction", () => {
    it("should perform a transaction and return the result", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const query = "INSERT INTO mockTable (name, id) VALUES (:name, :id)"
      const result = await mySQLDriverTest.transaction((tx) =>
        tx.executeResult(query, { name: "Bob", id: 0 })
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
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const query = "INSERT INTO mockTable"
      expect(
        mySQLDriverTest.transaction((tx) => tx.executeResult(query))
      ).rejects.toThrow(Error)
    })
  })

  describe("queryResult", () => {
    it("should execute a query and return the result rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      let query = "INSERT INTO mockTable (name, id) VALUES (:name, :id)"
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, { name: "Bob", id: 0 }))
      query = "SELECT * FROM mockTable"
      const result = await mySQLDriverTest.queryResult(query)
      expect(result.value).toEqual(
        [
          {
            id: 0,
            name: "Bob"
          }
        ]
      )
    })

    it("should convert null rows from results to undefined", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      await mySQLDriverTest.executeResult("INSERT INTO mockTable (name, id) VALUES (null, 0)")
      const result = await mySQLDriverTest.queryResult("SELECT * FROM mockTable")
      expect(result.value).toEqual(
        [
          {
            id: 0,
            name: undefined
          }
        ]
      )
    })

    it("should execute a query and cast mysql values", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const mockDate = new Date(100000)
      const query = "INSERT INTO mockTable (id, isActive, createdAt, updatedAt, price, data) VALUES (:id, :isActive, :createdAt, :updatedAt, :price, :data)"
      await mySQLDriverTest.executeResult(query, { id: 1, isActive: true, createdAt: mockDate, updatedAt: mockDate, price: 99.99, data: "{\"key\": \"value\"}" })
      const result = await mySQLDriverTest.queryResult("SELECT * FROM mockTable")
      expect(result.value).toEqual([
        {
          createdAt: mockDate,
          data: {
            key: "value"
          },
          id: 1,
          isActive: true,
          price: 99.99,
          updatedAt: mockDate
        }
      ])
    })

    it("should throw an error if query is used with a write statement", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const query = "INSERT INTO mockTable (name, id) VALUES ('Bob', 0)"
      await expect(mySQLDriverTest.queryResult(query)).rejects.toThrowError("Query did not return an array of rows and fields.")
    })
  })

  describe("queryFirstResult", () => {
    it("should execute a query and return the result rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      let query = "INSERT INTO mockTable (name, id) VALUES ('Bob', 0)"
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query))
      query = "SELECT * FROM mockTable"
      const result = await mySQLDriverTest.queryFirstResult(query)
      expect(result.value).toEqual(
        {
          id: 0,
          name: "Bob"
        }
      )
    })

    it("should throw an error if query returns no rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const query = "SELECT * FROM mockTable"
      const result = await mySQLDriverTest.queryFirstResult(query)
      expect(result.status).toEqual("failure")
    })
  })

  describe("queryHasResults", () => {
    it("should execute a query and return the result rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      let query = "INSERT INTO mockTable (name, id) VALUES ('Bob', 0)"
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query))
      query = "SELECT * FROM mockTable"
      const result = await mySQLDriverTest.queryHasResults(query)
      expect(result.value).toEqual(true)
    })

    it("should throw an error if query returns no rows", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      const query = "SELECT * FROM mockTable"
      const result = await mySQLDriverTest.queryHasResults(query)
      expect(result.status).toEqual("failure")
    })
  })

  describe("closeConnection", () => {
    it("should close the connection", async () => {
      await mySQLDriverTest.executeResult("DELETE FROM mockTable")
      await mySQLDriverTest.closeConnection()
      const query = "INSERT INTO mockTable (name, id) VALUES ('Chungus',1)"
      await expect(mySQLDriverTest.executeResult(query)).rejects.toThrow("Current connection instance was ended.")
    })
  })
})
