import { LocationCoordinate2D, LocationCoordinates2DSchema, SQLExecutable, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { getUpcomingEventsByRegion } from "./getUpcomingEvents.js"

const SetDepartureSchema = z
  .object({
    location: LocationCoordinates2DSchema,
    arrivalRadiusMeters: z.number().optional() // may use in the future
  })

export type SetDepartureInput = z.infer<typeof SetDepartureSchema>

const setDepartureTransaction = (
  environment: ServerEnvironment,
  userId: string,
  request: SetDepartureInput
) =>
  conn.transaction((tx) =>
    deleteArrival(
      tx,
      userId,
      request.location
    )
      .flatMapSuccess(() => getUpcomingEventsByRegion(tx, userId))
  )
    .mapSuccess((eventRegions) => ({ status: 200, upcomingRegions: eventRegions }))

export const deleteArrival = (
  conn: SQLExecutable,
  userId: string,
  location: LocationCoordinate2D
) =>
  conn
    .queryResults( // TO DECIDE: if event length limit or limit in how far in advance event can be scheduled, then we can also delete outdated arrivals
      `
        DELETE FROM userArrivals
        WHERE userId = :userId
        AND latitude = :latitude
        AND longitude = :longitude         
      `,
      { userId, latitude: location.latitude, longitude: location.longitude }
    )

export const setDepartureRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  router.postWithValidation(
    "/departed",
    { bodySchema: SetDepartureSchema },
    (req, res) => {
      return setDepartureTransaction(environment, res.locals.selfId, req.body)
        .mapSuccess(({ status, upcomingRegions }) => res.status(status).json({ upcomingRegions }))
    }
  )
}

// TODO: Add notifications
