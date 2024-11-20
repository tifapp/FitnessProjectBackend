import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { failure, success } from "TiFShared/lib/Result"
import { TiFAPIRouterExtension } from "../../router"
import { upcomingEventArrivalRegionsSQL } from "./getUpcomingEvents"

// type ArrivalStatusEnum = "invalid" | "early" | "on-time" | "late" | "ended" // so far, unused

export const deleteOldArrivals = (
  conn: MySQLExecutableDriver,
  userId: string,
  coordinate: LocationCoordinate2D
) =>
  conn.executeResult(
    // TO DECIDE: if event length limit or limit in how far in advance event can be scheduled, then we can also delete outdated arrivals
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
    .flatMapSuccess((arrivalCount) =>
      arrivalCount > arrivalsLimit
        ? conn.queryFirstResult<{
            userId: string
            latitude: number
            longitude: number
          }>(
            `
        SELECT arrivedDateTime FROM userArrivals 
        WHERE userId = :userId 
        ORDER BY arrivedDateTime ASC 
        LIMIT 1 
      `,
            { userId }
          )
        : failure()
    )
    .flatMapSuccess((arrival) =>
      conn.executeResult(
        `
        DELETE FROM userArrivals 
        WHERE userId = :userId 
        AND latitude = :latitude 
        AND longitude = :longitude;      
      `,
        { userId, latitude: arrival.latitude, longitude: arrival.longitude }
      )
    )
    .flatMapFailure(() => success())

export const insertArrival = (
  conn: MySQLExecutableDriver,
  userId: string,
  coordinate: LocationCoordinate2D
) =>
  conn.executeResult(
    `
        INSERT INTO userArrivals (userId, latitude, longitude)
        VALUES (:userId, :latitude, :longitude)
        ON DUPLICATE KEY UPDATE arrivedDateTime = CURRENT_TIMESTAMP;    
      `,
    { userId, latitude: coordinate.latitude, longitude: coordinate.longitude }
  )

export const arriveAtRegion = (({
  context: { selfId },
  environment: { maxArrivals },
  body: { coordinate }
}) =>
  conn
    .transaction((tx) =>
      deleteOldArrivals(tx, selfId, coordinate)
        .passthroughSuccess(() => deleteMaxArrivals(tx, selfId, maxArrivals))
        .passthroughSuccess(() => insertArrival(tx, selfId, coordinate))
        .flatMapSuccess(() => upcomingEventArrivalRegionsSQL(conn, selfId))
    )
    .mapSuccess((trackableRegions) => resp(200, { trackableRegions }))
    .unwrap()) satisfies TiFAPIRouterExtension["arriveAtRegion"]
