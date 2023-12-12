import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { EventColorSchema } from "./models.js"

const CreateEventSchema = z
  .object({
    description: z.string().max(500),
    startTimestamp: z.string().datetime(),
    endTimestamp: z.string().datetime(),
    color: EventColorSchema,
    title: z.string().max(50),
    shouldHideAfterStartDate: z.boolean(),
    isChatEnabled: z.boolean(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
  .transform((res) => ({
    ...res,
    startTimestamp: new Date(res.startTimestamp),
    endTimestamp: new Date(res.endTimestamp)
  }))

export type CreateEventInput = z.infer<typeof CreateEventSchema>

export const createEvent = (
  conn: SQLExecutable,
  input: CreateEventInput,
  hostId: string
) =>
  conn
    .queryResult(
      `
INSERT INTO event (
  hostId,
  title, 
  description, 
  startTimestamp, 
  endTimestamp, 
  color, 
  shouldHideAfterStartDate, 
  isChatEnabled, 
  latitude, 
  longitude
) VALUES (
  :hostId,
  :title, 
  :description, 
  FROM_UNIXTIME(:startTimestamp), 
  FROM_UNIXTIME(:endTimestamp), 
  :color, 
  :shouldHideAfterStartDate, 
  :isChatEnabled, 
  :latitude, 
  :longitude
)
`,
      {
        ...input,
        startTimestamp: input.startTimestamp.getTime() / 1000,
        endTimestamp: input.endTimestamp.getTime() / 1000,
        hostId
      }
    )

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEventRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Create an event
   */
  router.postWithValidation(
    "/",
    { bodySchema: CreateEventSchema },
    (req, res) => {
      return createEvent(conn, req.body, res.locals.selfId)
        .mapFailure((error) => res.status(500).json({ error }))
        .mapSuccess(({ insertId }) => res.status(201).json({ id: insertId }))
    }
  )
}
