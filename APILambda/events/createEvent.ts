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

type CreateEventInput = z.infer<typeof CreateEventSchema>

const createEvent = (
  conn: SQLExecutable,
  input: CreateEventInput,
  hostId: string
) => conn.queryResultId(`
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
}).withFailure("user-not-found" as const)

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
  router.postWithValidation("/", { bodySchema: CreateEventSchema }, (req, res) => {
    return createEvent(tx, req.body, res.locals.selfId)
      .mapFailure((error) => res.status(401).json({ error }))
      .mapSuccess(() => res.status(201).send())
  })
}
