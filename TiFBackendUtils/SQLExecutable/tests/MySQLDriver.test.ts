import { MySQLExecutableDriver } from "../../MySQLDriver/MySQLDriver"

export type ExecuteResult = {
  id: string
  rowsAffected: number
}

describe("MySQLExecutableDriver", () => {
  let mySQLDriverTest: MySQLExecutableDriver

  beforeAll(async () => {
    mySQLDriverTest = new MySQLExecutableDriver()
    const createMySQLDriverTableSQL = `
    CREATE TABLE IF NOT EXISTS mySQLDriver (
    id bigint NOT NULL,
    name varchar(50) NOT NULL,
    PRIMARY KEY (id)
    )`
    await mySQLDriverTest.execute(createMySQLDriverTableSQL)
  })

  afterAll(async () => {
    await mySQLDriverTest.closeConnection()
    const deleteMySQLDriverTableSQL = `
    DROP TABLE IF EXISTS mySQLDriver
    `
    mySQLDriverTest = new MySQLExecutableDriver()
    await mySQLDriverTest.execute(deleteMySQLDriverTableSQL)
  })

  describe("execute", () => {
    it("should execute a query and return the result", async () => {
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Surya',0)"
      const result = await mySQLDriverTest.execute(query)
      expect(result).toEqual({
        rowsAffected: 1,
        insertId: "0"
      })
    })

    it("should throw an error if execution does not return a ResultSetHeader", async () => {
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "SELECT * FROM mySQLDriver"
      const args = null
      await expect(mySQLDriverTest.execute(query, args)).rejects.toThrow(
        "Execution did not return a ResultSetHeader."
      )
    })
  })

  describe("transaction", () => {
    it("should perform a transaction and return the result", async () => {
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
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
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "INSERT INTO mySQLDriver"
      const args = null
      expect(
        mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      ).rejects.toThrow(Error)
    })
  })

  describe("query", () => {
    it("should execute a query and return the result rows", async () => {
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      let query = "INSERT INTO mySQLDriver (name, id) VALUES ('Bob', 0)"
      const args = null
      await mySQLDriverTest.transaction((tx) => tx.executeResult(query, args))
      query = "SELECT * FROM mySQLDriver"
      const result = await mySQLDriverTest.query(query, args)
      expect(result).toEqual(
        [
          {
            id: 0,
            name: "Bob"
          }
        ]
      )
    })
    it("should throw an error if query does not return an array of rows and fields", async () => {
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Bob', 0)"
      const args = null
      await expect(mySQLDriverTest.query(query, args)).rejects.toThrowError("Query did not return an array of rows and fields.")
    })
  })

  describe("closeConnection", () => {
    it("should close the connection", async () => {
      await mySQLDriverTest.execute("DELETE FROM mySQLDriver")
      await mySQLDriverTest.closeConnection()
      const query = "INSERT INTO mySQLDriver (name, id) VALUES ('Chungus',1)"
      await expect(mySQLDriverTest.execute(query)).rejects.toThrow("Current connection instance was ended.")
    })
  })
})
