import { randomUUID } from "crypto"
import {
  insertUser
} from "."
import { conn } from "../dbconnection"
import { userNotFoundBody } from "../shared/Responses"
import { resetDatabaseBeforeEach } from "../test/database"
import { callPostUser } from "../test/helpers/users"
import { testUserIdentifier, testUsers } from "../test/testVariables"

describe("Users tests", () => {
  resetDatabaseBeforeEach()

  it("should 400 on invalid request body", async () => {
    const resp = await callPostUser(testUserIdentifier, {
      name: 1,
      handle: "iusdbdkjbsjbdjsbdsdsudbusybduysdusdudbsuyb"
    } as any)

    expect(resp.status).toEqual(404)
    expect(resp.body).toMatchObject(userNotFoundBody(testUserIdentifier))
  })

  it("should 201 when creating a user with a unique id and handle", async () => {
    const userId = randomUUID()
    const resp = await callPostUser(testUserIdentifier, testUsers[0])

    expect(resp.status).toEqual(201)
    expect(resp.body).toMatchObject({ id: userId })
  })

  it("should 400 when trying to create a user with an already existing id", async () => {
    await callPostUser(testUserIdentifier, testUsers[0])

    const resp = await callPostUser(testUserIdentifier, testUsers[0])
    expect(resp.status).toEqual(400)
    expect(resp.body).toMatchObject({ error: "user-already-exists" })
  })

  it("should 400 when trying to create a user with a duplicate handle", async () => {
    await insertUser(conn, testUsers[1])

    const resp = await callPostUser(testUserIdentifier, {
      ...testUsers[0],
      handle: testUsers[1].handle
    })
    expect(resp.status).toEqual(400)
    expect(resp.body).toMatchObject({ error: "duplicate-handle" })
  })
})
