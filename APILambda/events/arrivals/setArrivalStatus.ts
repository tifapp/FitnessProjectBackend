import { LocationCoordinate2D, LocationCoordinates2DSchema, SQLExecutable, conn, failure, success } from "TiFBackendUtils"
import { z } from "zod"
import { ServerEnvironment } from "../../env.js"
import { ValidatedRouter } from "../../validation.js"

// type ArrivalStatusEnum = "invalid" | "early" | "on-time" | "late" | "ended" // so far, unused
type ArrivalStatusEnum = "success" | "outdated-coordinate" | "remove-from-tracking"
type ArrivalStatus = { id: number, latitude?: number, longitude?: number, arrivalStatus: ArrivalStatusEnum }

// 24 hour window should be parameterized based on env variable
// ArrivalStatus = "success" | "outdated/moved" (only here do we give new location) | "removeFromTracking" (moved out of 24 hour window OR event doesnt exist) | null
// put array in an object with field "arrivalStatuses"

const SetArrivalStatusSchema = z
  .object({
    location: LocationCoordinates2DSchema,
    events: z.array(
      z.number()
    ).min(1).max(50).optional()
  })

export type SetArrivalStatusInput = z.infer<typeof SetArrivalStatusSchema>

const addNullResults = (events: number[]) =>
  (arrivalStatuses: ArrivalStatus[]) => {
    let resultIndex = 0
    const resultArray: (ArrivalStatus | null)[] = []

    events.forEach((event) => {
      const currentArrivalStatus = arrivalStatuses[resultIndex]
      if (resultIndex >= arrivalStatuses.length || event !== currentArrivalStatus.id) {
        resultArray.push({ id: event, arrivalStatus: "remove-from-tracking" })
      } else if (resultIndex < arrivalStatuses.length && event === currentArrivalStatus.id) {
        if (currentArrivalStatus.arrivalStatus !== "outdated-coordinate") {
          currentArrivalStatus.latitude = undefined
          currentArrivalStatus.longitude = undefined
        }
        resultArray.push(currentArrivalStatus)
        resultIndex++
      }
    })

    return resultArray
  }

export const getAttendingEvents = (
  conn: SQLExecutable,
  userId: string,
  latitude: number,
  longitude: number,
  events: number[],
  hoursBeforeEventStart: number
) =>
  conn
    .queryResults<ArrivalStatus>(
      `

      SELECT e.id, e.latitude, e.longitude,
      CASE
        WHEN NOW() > e.endTimestamp THEN "remove-from-tracking"
        WHEN TIMESTAMPDIFF(HOUR, NOW(), e.startTimestamp) > 24 THEN "remove-from-tracking"
        WHEN e.latitude != :latitude OR e.longitude != :longitude THEN "outdated-coordinate"
        WHEN TIMESTAMPDIFF(HOUR, NOW(), e.startTimestamp) > :hoursBeforeEventStart THEN "success"
        WHEN TIMESTAMPDIFF(HOUR, NOW(), e.startTimestamp) <= :hoursBeforeEventStart THEN "success"
        ELSE "success"
      END as arrivalStatus
      FROM event e
      WHERE e.id IN (${events.join(",")});      
     
      `,
      { latitude, longitude, userId, hoursBeforeEventStart, events: events.join(",") } // TODO: prepared statement not working with lists
    ).mapSuccess(addNullResults(events))

export const deleteOldArrivals = (
  conn: SQLExecutable,
  userId: string,
  location: LocationCoordinate2D
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
      { userId, latitude: location.latitude, longitude: location.longitude }
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
  location: LocationCoordinate2D
) =>
  conn
    .queryResult(
      `
        INSERT INTO userArrivals (userId, latitude, longitude)
        VALUES (:userId, :latitude, :longitude)
        ON DUPLICATE KEY UPDATE arrivedAt = CURRENT_TIMESTAMP;    
      `,
      { userId, latitude: location.latitude, longitude: location.longitude }
    )

const setArrivalStatusTransaction = (
  environment: ServerEnvironment,
  userId: string,
  request: SetArrivalStatusInput
) =>
  conn.transaction((tx) => deleteOldArrivals(tx, userId, request.location)
    .flatMapSuccess(() => deleteMaxArrivals(tx, userId, environment.maxArrivals))
    .flatMapSuccess(() => request.events && request.events.length > 0 ? getAttendingEvents(tx, userId, request.location.latitude, request.location.longitude, request.events, environment.eventStartWindowInHours) : success())
    .flatMapSuccess(arrivalStatuses =>
      (insertArrival(
        tx,
        userId,
        request.location
      )).mapSuccess(() => ({ status: 200, arrivalStatuses })))
  )

export const setArrivalStatusRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  router.postWithValidation(
    "/arrived",
    { bodySchema: SetArrivalStatusSchema },
    (req, res) => {
      return setArrivalStatusTransaction(environment, res.locals.selfId, req.body)
        .mapSuccess((result) => res.status(result.status).json({ arrivalStatuses: result.arrivalStatuses }))
    }
  )
}

// TODO: Add notifications
