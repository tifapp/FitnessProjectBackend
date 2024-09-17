import { conn } from "TiFBackendUtils"
import { generateUniqueHandle } from "./generateUserHandle"

describe("generateUniqueHandle", () => {
  it("should generate a unique usernames from the same name", async () => {
    const username1 = await generateUniqueHandle(conn, "John Doe")
    const username2 = await generateUniqueHandle(conn, "John Doe")
    expect(username1).not.toEqual(username2)
  })

  it("should clean name properly", async () => {
    const username = await generateUniqueHandle(conn, "J@hn D0e!!!")
    expect(JSON.stringify(username.value).substr(1, 6)).toEqual("jhnd0e")
    expect(JSON.stringify(username.value).slice(0, -1).substr(7)).toMatch(/^\d{4}$/)
  })

  it("should produce a handle starting with 'idk' if name has 0 valid characters", async () => {
    const username = await generateUniqueHandle(conn, "@ !!!")
    expect(JSON.stringify(username.value).substr(1, 3)).toEqual("idk")
    expect(JSON.stringify(username.value).slice(0, -1).substr(4)).toMatch(/^\d{4}$/)
  })

  // it("should throw an error after max retries", async () => {
  //   // Assuming the maxRetries is set to 10 in your function
  //   for (let i = 0; i < 11; i++) {
  //     const username = `johndoe${i.toString().padStart(5, "0")}`
  //     addUsernameToDatabase(username)
  //   }

  //   await expect(generateUniqueUsername(conn, "John Doe")).rejects.toThrow("Max retries reached while generating a unique username.")
  // })
})
