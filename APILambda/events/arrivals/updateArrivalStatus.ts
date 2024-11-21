import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { failure, success } from "TiFShared/lib/Result"
import { authenticatedEndpoint } from "../../auth"
import { upcomingEventArrivalRegionsSQL } from "./getUpcomingEvents"
import { UserID } from "TiFShared/domain-models/User"
import { EventArrivalRegion, EventRegion } from "TiFShared/domain-models/Event"

const deleteOldArrivals = (
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

const deleteMaxArrivals = (
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

const deleteArrival = (
  conn: MySQLExecutableDriver,
  userId: UserID,
  coordinate: LocationCoordinate2D
) =>
  conn.executeResult(
    // TO DECIDE: if event length limit or limit in how far in advance event can be scheduled, then we can also delete outdated arrivals
    `
        DELETE FROM userArrivals
        WHERE userId = :userId
        AND latitude = :latitude
        AND longitude = :longitude
      `,
    { userId, latitude: coordinate.latitude, longitude: coordinate.longitude }
  )

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

type EventRegionArrivalStatusUpdate = EventRegion & {
  status?: "arrived" | "departed"
}

const updateArrivalStatusTransaction = (
  conn: MySQLExecutableDriver,
  selfId: UserID,
  maxArrivals: number,
  { coordinate, status }: EventRegionArrivalStatusUpdate
) => {
  return conn.transaction((tx) => {
    if (status === "arrived") {
      return deleteOldArrivals(tx, selfId, coordinate)
        .passthroughSuccess(() => deleteMaxArrivals(tx, selfId, maxArrivals))
        .passthroughSuccess(() => insertArrival(tx, selfId, coordinate))
        .flatMapSuccess(() => upcomingEventArrivalRegionsSQL(conn, selfId))
    } else {
      return deleteArrival(tx, selfId, coordinate).flatMapSuccess(() =>
        upcomingEventArrivalRegionsSQL(conn, selfId)
      )
    }
  })
}

export const updateArrivalStatus = authenticatedEndpoint<"updateArrivalStatus">(
  ({ context: { selfId }, environment: { maxArrivals }, body }) =>
    updateArrivalStatusTransaction(conn, selfId, maxArrivals, body)
      .mapSuccess((trackableRegions) => resp(200, { trackableRegions }))
      .unwrap()
)
