import {
  MySQLExecutableDriver,
  conn
} from "TiFBackendUtils"
import { success } from "TiFShared/lib/Result.js"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"
import { addUserToAttendeeList } from "./joinEventById.js"

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
          message: "endDateTime must be in the future"
          // TODO: add minimum duration check
        }
      ),
    color: z.string(), // TODO: Use ColorString from shared package
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
  conn: MySQLExecutableDriver,
  input: CreateEventInput,
  hostId: string
) => {
  return conn.executeResult(
    `
  INSERT INTO event (
    hostId,
    title, 
    description, 
    startDateTime, 
    endDateTime, 
    color, 
    shouldHideAfterStartDate, 
    isChatEnabled, 
    latitude, 
    longitude
  ) VALUES (
    :hostId,
    :title, 
    :description, 
    :startDateTime, 
    :endDateTime, 
    :color, 
    :shouldHideAfterStartDate, 
    :isChatEnabled, 
    :latitude, 
    :longitude
  )
  `,
    {
      ...input,
      hostId
    }
  )
}

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
