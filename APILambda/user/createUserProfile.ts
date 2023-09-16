import { Router } from "express"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { withValidatedRequest } from "../validation.js"
import {
  registerNewUser
} from "./SQL.js"

const CreateUserSchema = z.object({
  body: z.object({
    name: z.string().max(50),
    handle: z.string().regex(/^[a-z_0-9]{1,15}$/)
  })
})

/**
 * Creates routes related to user operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createUserProfileRouter = (environment: ServerEnvironment, router: Router) => {
  /**
   * creates a new user
   */
  router.post("/", async (req, res) => {
    await withValidatedRequest(req, res, CreateUserSchema, async (data) => {
      const result = await environment.conn.transaction(async (tx) => {
        const registerReq = Object.assign(data.body, { id: res.locals.selfId })
        return await registerNewUser(tx, registerReq)
      })

      if (result.status === "error") {
        return res.status(400).json({ error: result.value })
      }
      return res.status(201).json(result.value)
    })
  })
}
