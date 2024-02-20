import { LocationCoordinate2D, LocationCoordinates2DSchema, SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment, SetArrivalStatusEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"
import { getUpcomingEventsByRegion } from "./getUpcomingEvents.js"

// type ArrivalStatusEnum = "invalid" | "early" | "on-time" | "late" | "ended" // so far, unused

const SetArrivalStatusSchema = z
  .object({
    coordinate: LocationCoordinates2DSchema,
    arrivalRadiusMeters: z.number().optional() // may use in the future
  })

export type SetArrivalStatusInput = z.infer<typeof SetArrivalStatusSchema>

export const deleteOldArrivals = (
  conn: SQLExecutable,
  userId: string,
  coordinate: LocationCoordinate2D
) =>
  conn
    .queryResults( // TO DECIDE: if event length limit or limit in how far in advance event can be scheduled, then we can also delete outdated arrivals
      `
        DELETE FROM userArrivals
        WHERE userId = :userId
        AND (
          ST_Distance_Sphere(
            POINT(latitude, longitude),
            POINT(:latitude, :longitude)
          ) > 1000
        );          
      `,
      { userId, latitude: coordinate.latitude, longitude: coordinate.longitude }
    )

export const deleteMaxArrivals = (
  conn: SQLExecutable,
  userId: string,
  arrivalsLimit: number
) =>
  conn
    .queryFirstResult<number>(
      `
      SELECT COUNT(*) FROM userArrivals WHERE userId = :userId
    `,
      { userId }
    )
    .flatMapSuccess((arrivalCount) => arrivalCount > arrivalsLimit
      ? conn.queryFirstResult<{userId: string, latitude: number, longitude: number}>(
        `
        SELECT arrivedAt FROM userArrivals 
        WHERE userId = :userId 
        ORDER BY arrivedAt ASC 
        LIMIT 1 
      `,
        { userId }
      )
      : failure())
    .flatMapSuccess((arrival) =>
      conn.queryResults(`
        DELETE FROM userArrivals 
        WHERE userId = :userId 
        AND latitude = :latitude 
        AND longitude = :longitude;      
      `,
      { userId, latitude: arrival.latitude, longitude: arrival.longitude })
    )
    .flatMapFailure(() => success())

export const insertArrival = (
  conn: SQLExecutable,
  userId: string,
  coordinate: LocationCoordinate2D
) =>
  conn
    .queryResult(
      `
        INSERT INTO userArrivals (userId, latitude, longitude)
        VALUES (:userId, :latitude, :longitude)
        ON DUPLICATE KEY UPDATE arrivedAt = CURRENT_TIMESTAMP;    
      `,
      { userId, latitude: coordinate.latitude, longitude: coordinate.longitude }
    )

const setArrivalStatusTransaction = (
  { maxArrivals }: SetArrivalStatusEnvironment,
  userId: string,
  request: SetArrivalStatusInput
) =>
  conn.transaction((tx) => deleteOldArrivals(tx, userId, request.coordinate)
    .flatMapSuccess(() => deleteMaxArrivals(tx, userId, maxArrivals))
    .flatMapSuccess(() =>
      insertArrival(
        tx,
        userId,
        request.coordinate
      ))
    .flatMapSuccess(() => getUpcomingEventsByRegion(tx, userId))
  )
    .mapSuccess((eventRegions) => ({ status: 200, upcomingRegions: eventRegions }))

export const setArrivalStatusRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  router.postWithValidation(
    "/arrived",
    { bodySchema: SetArrivalStatusSchema },
    (req, res) => {
      return setArrivalStatusTransaction(environment, res.locals.selfId, req.body)
        .mapSuccess(({ status, upcomingRegions }) => res.status(status).json({ upcomingRegions }))
    }
  )
}

// TODO: Add notifications
