import {
  SQLExecutable,
  addPlacemarkToDB,
  checkExistingPlacemarkInDB,
  conn,
  success
} from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../env.js"
import { HOST } from "../shared/Role.js"
import { ValidatedRouter } from "../validation.js"
import { addUserToAttendeeList } from "./joinEventById.js"
import { EventColorSchema } from "./models.js"

let insertIdForEvent: string

const CreateEventSchema = z
  .object({
    description: z.string().max(500),
    startTimestamp: z.string().datetime(),
    endTimestamp: z
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
    startTimestamp: new Date(res.startTimestamp),
    endTimestamp: new Date(res.endTimestamp)
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
      startTimestamp: input.startTimestamp.getTime() / 1000,
      endTimestamp: input.endTimestamp.getTime() / 1000,
      hostId
    }
  )

export const addPlacemarkForEvent = (
  insertId: string,
  eventLatitude: number,
  eventLongitude: number,
  SearchForPositionResultToPlacemark: ServerEnvironment["SearchForPositionResultToPlacemark"],
  callGeocodingLambda: ServerEnvironment["callGeocodingLambda"]
) => {
  insertIdForEvent = insertId
  return checkExistingPlacemarkInDB(conn, {
    longitude: eventLongitude,
    latitude: eventLatitude
  })
    .flatMapSuccess(() => {
      const placemark = SearchForPositionResultToPlacemark({
        latitude: eventLatitude,
        longitude: eventLongitude
      })
      if (placemark === undefined) {
        callGeocodingLambda(eventLatitude, eventLongitude)
      } else {
        addPlacemarkToDB(conn, placemark)
      }
      return success()
    })
    .flatMapFailure(() => {
      return success()
    })
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
  router.postWithValidation(
    "/",
    { bodySchema: CreateEventSchema },
    (req, res) => {
      return conn
        .transaction((tx) =>
          createEvent(tx, req.body, res.locals.selfId)
            .flatMapSuccess(({ insertId }) => {
              return addPlacemarkForEvent(
                insertId,
                req.body.latitude,
                req.body.longitude,
                environment.SearchForPositionResultToPlacemark,
                environment.callGeocodingLambda
              )
            })
            .flatMapSuccess(() =>
              addUserToAttendeeList(
                tx,
                res.locals.selfId,
                parseInt(insertIdForEvent),
                HOST
              )
            )
        )
        .mapFailure((error) => res.status(500).json({ error }))
        .mapSuccess(() => res.status(201).json({ id: insertIdForEvent }))
    }
  )
}
