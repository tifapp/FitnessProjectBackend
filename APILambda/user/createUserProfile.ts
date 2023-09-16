import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import {
  registerNewUser
} from "./SQL.js"

export const createUserProfileRouter = (environment: ServerEnvironment, router: ValidatedRouter) =>
  router.post("/", {}, async (req, res) => {
    // check that id is unique
    // generate new handle

    const registerReq = Object.assign(req.body, { id: res.locals.selfId }) // could be transformed within validateRequestBody
    const result = await environment.conn.transaction(async (tx) => {
      return await registerNewUser(tx, registerReq)
    })

    if (result.status === "error") {
      return res.status(400).json({ error: result.value })
    }
    return res.status(201).json(result.value)
  })
