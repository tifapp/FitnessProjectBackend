import { UNAUTHORIZED_RESPONSE } from "../auth.js"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import {
  registerNewUser
} from "./SQL.js"
import { generateUniqueUsername } from "./generateUserHandle.js"

export const createUserProfileRouter = (environment: ServerEnvironment, router: ValidatedRouter) =>
  router.post("/", {}, async (req, res) => {
    if (res.locals.name === "") {
      console.error("invalid headers")
      res.status(401).json(UNAUTHORIZED_RESPONSE)
      return
    }

    const registerReq = {
      id: res.locals.selfId,
      name: res.locals.name
    }
    // Check if we can pass this data as a req so then we can reuse the validation middleware.

    try {
      const handle = await generateUniqueUsername(environment.conn, registerReq.name)

      const result = await environment.conn.transaction(async (tx) => {
        return await registerNewUser(tx, Object.assign(registerReq, { handle }))
      })

      if (result.status === "error") {
        return res.status(400).json({ error: result.value })
      }

      return res.status(201).json(result.value)
    } catch (e) {
      console.log("create user error is ", e)
      return res.status(500).json({ error: e })
    }
  })
