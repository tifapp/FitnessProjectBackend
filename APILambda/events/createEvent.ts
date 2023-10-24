import { SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { userNotFoundBody } from "../shared/Responses.js"
import { userWithIdExists } from "../user/SQL.js"
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

/**
 * Creates an event in the database.
 *
 * @param request see {@link CreateEventRequest}
 */
const insertEvent = async (
  conn: SQLExecutable,
  request: CreateEventInput,
  hostId: string
) => {
  await conn.queryResults(
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
      ...request,
      startTimestamp: request.startTimestamp.getTime() / 1000,
      endTimestamp: request.endTimestamp.getTime() / 1000,
      hostId
    }
  )
}

const createEvent = async (
  conn: SQLExecutable,
  hostId: string,
  input: CreateEventInput
) => {
  const userExists = await userWithIdExists(conn, hostId)
  if (!userExists) {
    return { status: "error", value: userNotFoundBody(hostId) }
  }

  await insertEvent(conn, input, hostId)

  return { status: "success", value: { id: await selectLastInsertionId(conn) } }
}

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
    return conn
      .transaction((tx) => createEvent(tx, res.locals.selfId, req.body))
      .mapFailure((error) => res.status(401).json({ error }))
      .mapSuccess(() => res.status(201).send())
  })
}
