import { conn } from "TiFBackendUtils"
import { generateUniqueUsername } from "./generateUserHandle.js"

describe("generateUniqueUsername", () => {
  it("should generate a unique usernames from the same name", async () => {
    const username1 = await generateUniqueUsername(conn, "John Doe")
    const username2 = await generateUniqueUsername(conn, "John Doe")
    expect(username1).not.toEqual(username2)
  })

  it("should clean name properly", async () => {
    const username = await generateUniqueUsername(conn, "J@hn D0e!!!")
    expect((username.value as string).substr(0, 6)).toEqual("jhnd0e")
    expect((username.value as string).substr(6)).toMatch(/^\d{4}$/)
  })

  it("should produce a handle starting with 'idk' if name has 0 valid characters", async () => {
    const username = await generateUniqueUsername(conn, "@ !!!")
    expect((username.value as string).substr(0, 3)).toEqual("idk")
    expect((username.value as string).substr(3)).toMatch(/^\d{4}$/)
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
