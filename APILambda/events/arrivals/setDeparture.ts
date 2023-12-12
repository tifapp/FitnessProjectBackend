import { LocationCoordinate2D, LocationCoordinates2DSchema, conn } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"

const SetDepartureSchema = z
  .object({
    location: LocationCoordinates2DSchema
  })

export type SetDepartureInput = z.infer<typeof SetDepartureSchema>

export const deleteArrival = (
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
      return deleteArrival(res.locals.selfId, req.body.location)
        .mapSuccess(() => res.status(200).json())
    }
  )
}

// TODO: Add notifications
