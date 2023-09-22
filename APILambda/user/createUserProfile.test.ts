import { it } from "node:test"
import { resetDatabaseBeforeEach } from "../test/database"
import { callPostUser } from "../test/helpers/users"
import { generateMockToken, mockClaims, mockToken } from "../test/testVariables"

describe("Create User Profile tests", () => {
  resetDatabaseBeforeEach()

  it("should 401 when user is not verified", async () => {
    const resp = await callPostUser(generateMockToken({ ...mockClaims, email_verified: false, phone_number_verified: false }))

    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ error: "Unauthorized" })
  })

  it("should 401 when user is missing 'name' attribute", async () => {
    const resp = await callPostUser(generateMockToken({ ...mockClaims, name: "" }))

    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ error: "Unauthorized" })
  })

  it("should 400 when trying to create a user with an already existing id", async () => {
    await callPostUser(mockToken)

    const resp = await callPostUser(mockToken)
    expect(resp.status).toEqual(400)
    expect(resp.body).toMatchObject({ error: "user-already-exists" })
  })

  it("should 201 when creating a user with a unique id and handle", async () => {
    const resp = await callPostUser(mockToken)

    expect(resp.status).toEqual(201)
    expect(resp.body).toMatchObject({ id: mockClaims.sub })
  })

  // TODO: Add test for update user profile tests
  // it("should 400 when trying to create a user with a duplicate handle", async () => {
  //   await insertUser(conn, testUsers[1])

  //   const resp = await callPostUser(testUserIdentifier, {
  //     ...testUsers[0],
  //     handle: testUsers[1].handle
  //   })
  //   expect(resp.status).toEqual(400)
  //   expect(resp.body).toMatchObject({ error: "duplicate-handle" })
  // })
})
