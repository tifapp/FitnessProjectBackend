import {
  SQLExecutable,
  conn,
  success
} from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { addUserToAttendeeList } from "./joinEventById.js"
import { EventColorSchema } from "./models.js"

const CreateEventSchema = z
  .object({
    description: z.string().max(500),
    startDateTime: z.string().datetime(),
    endDateTime: z
      .string()
      .datetime()
      .refine(
        (date) => {
          return new Date(date) > new Date()
        },
        {
          message: "endTimestamp must be in the future"
          // TODO: add minimum duration check
        }
      ),
    color: EventColorSchema,
    title: z.string().max(50),
    shouldHideAfterStartDate: z.boolean(),
    isChatEnabled: z.boolean(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
  .transform((res) => ({
    ...res,
    startDateTime: new Date(res.startDateTime),
    endDateTime: new Date(res.endDateTime)
  }))

export type CreateEventInput = z.infer<typeof CreateEventSchema>

export const createEvent = (
  conn: SQLExecutable,
  input: CreateEventInput,
  hostId: string
) =>
  conn.queryResult(
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
      startTimestamp: input.startDateTime.getTime() / 1000,
      endTimestamp: input.endDateTime.getTime() / 1000,
      hostId
    }
  )

/**
 * Creates routes related to event operations.
 *
 * @param environment see {@link ServerEnvironment}.
 */
export const createEventRouter = (
  { callGeocodingLambda }: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * Create an event
   */
  router.postWithValidation(
    "/",
    { bodySchema: CreateEventSchema },
    (req, res) => {
      return conn
        .transaction((tx) =>
          createEvent(tx, req.body, res.locals.selfId)
            .flatMapSuccess(({ insertId }) =>
              addUserToAttendeeList(
                tx,
                res.locals.selfId,
                parseInt(insertId),
                "hosting"
              ).flatMapSuccess(async () => {
                try {
                  const resp = await callGeocodingLambda({
                    longitude:
                    req.body.longitude,
                    latitude:
                    req.body.latitude
                  })
                  console.debug(JSON.stringify(resp, null, 4))
                } catch (e) {
                  console.error("Could not create placemark for ", req.body)
                  console.error(e)
                } finally {
                  // eslint-disable-next-line no-unsafe-finally
                  return success()
                }
              }
              ).mapSuccess(() => ({ insertId }))
            )
        )
        .mapFailure((error) => res.status(500).json({ error }))
        .mapSuccess(({ insertId }) => res.status(201).json({ id: insertId }))
    }
  )
}
