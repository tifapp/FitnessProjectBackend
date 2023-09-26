import { resetDatabaseBeforeEach } from "../test/database.js"
import { callPostUser } from "../test/helpers/users.js"
import { generateMockToken, mockClaims, testUserIdentifier } from "../test/testVariables.js"

describe("Create User Profile tests", () => {
  resetDatabaseBeforeEach()

  it("should 401 when user is not verified", async () => {
    // TODO: Remove "Bearer" from test
    const resp = await callPostUser(`Bearer ${generateMockToken({ ...mockClaims, email_verified: false, phone_number_verified: false })}`)

    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ error: "Unauthorized" })
  })

  it("should 401 when user is missing 'name' attribute", async () => {
    const resp = await callPostUser(`Bearer ${generateMockToken({ ...mockClaims, name: "" })}`)

    expect(resp.status).toEqual(401)
    expect(resp.body).toMatchObject({ error: "Unauthorized" })
  })

  it("should 400 when trying to create a user with an already existing id", async () => {
    await callPostUser(testUserIdentifier)

    const resp = await callPostUser(testUserIdentifier)
    expect(resp.status).toEqual(400)
    expect(resp.body).toMatchObject({ error: "user-already-exists" })
  })

  it("should 201 when creating a user with a unique id and handle", async () => {
    const resp = await callPostUser(testUserIdentifier)

    expect(resp.status).toEqual(201)
    expect(resp.body).toMatchObject({ id: mockClaims.sub })
    expect(resp.body.handle).toBeTruthy()
  })
})
