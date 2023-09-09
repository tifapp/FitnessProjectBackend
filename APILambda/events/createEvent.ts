import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { CreateEventSchema, createEvent } from "../shared/SQL.js"
import { withValidatedRequest } from "../validation.js"
import { Router } from "express"

const CreateEventRequestSchema = z
  .object({
    body: CreateEventSchema
  })

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEventRouter = (environment: ServerEnvironment, router: Router) => {
  /**
   * Create an event
   */
  router.post("/", async (req, res) => {
    await withValidatedRequest(req, res, CreateEventRequestSchema, async (request) => {
      const result = await environment.conn.transaction(async (tx) => {
        return await createEvent(tx, res.locals.selfId, request.body)
      })
      if (result.status === "error") {
        return res.status(404).json(result.value)
      }
      return res.status(201).json(result.value)
    })
  })
}
