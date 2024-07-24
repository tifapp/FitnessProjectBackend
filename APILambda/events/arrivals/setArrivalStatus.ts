import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { LocationCoordinate2D, LocationCoordinate2DSchema } from "TiFShared/domain-models/LocationCoordinate2D"
import { failure, success } from "TiFShared/lib/Result"
import { z } from "zod"
import { ServerEnvironment, SetArrivalStatusEnvironment } from "../../env"
import { ValidatedRouter } from "../../validation"
import { getUpcomingEventsByRegion } from "./getUpcomingEvents"

// type ArrivalStatusEnum = "invalid" | "early" | "on-time" | "late" | "ended" // so far, unused

const SetArrivalStatusSchema = z
  .object({
    coordinate: LocationCoordinate2DSchema,
    arrivalRadiusMeters: z.number().optional() // may use in the future
  })

export type SetArrivalStatusInput = z.infer<typeof SetArrivalStatusSchema>

export const deleteOldArrivals = (
  conn: MySQLExecutableDriver,
  userId: string,
  coordinate: LocationCoordinate2D
) =>
  conn
    .executeResult( // TO DECIDE: if event length limit or limit in how far in advance event can be scheduled, then we can also delete outdated arrivals
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
  conn: MySQLExecutableDriver,
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
        SELECT arrivedDateTime FROM userArrivals 
        WHERE userId = :userId 
        ORDER BY arrivedDateTime ASC 
        LIMIT 1 
      `,
        { userId }
      )
      : failure())
    .flatMapSuccess((arrival) =>
      conn.executeResult(`
        DELETE FROM userArrivals 
        WHERE userId = :userId 
        AND latitude = :latitude 
        AND longitude = :longitude;      
      `,
      { userId, latitude: arrival.latitude, longitude: arrival.longitude })
    )
    .flatMapFailure(() => success())

export const insertArrival = (
  conn: MySQLExecutableDriver,
  userId: string,
  coordinate: LocationCoordinate2D
) =>
  conn
    .executeResult(
      `
        INSERT INTO userArrivals (userId, latitude, longitude)
        VALUES (:userId, :latitude, :longitude)
        ON DUPLICATE KEY UPDATE arrivedDateTime = CURRENT_TIMESTAMP;    
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
    .flatMapSuccess(() => getUpcomingEventsByRegion(tx, userId)))
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
