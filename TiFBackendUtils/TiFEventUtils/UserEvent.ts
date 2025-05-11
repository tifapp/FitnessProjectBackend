export namespace UserEventSQL {
  export const BASE = `
    SELECT TifEventView.*,
    TIMESTAMPDIFF(SECOND, current_timestamp(), TifEventView.startDateTime) as tsDiff,
    current_timestamp() as ts,
    CASE WHEN TifEventView.hostId = :userId THEN 'current-user'
    ELSE
      CASE WHEN UserRelationOfHostToUser.status IS NULL THEN 'not-friends'
      ELSE UserRelationOfHostToUser.status
      END
    END AS fromThemToYou,
    CASE WHEN TifEventView.hostId = :userId THEN 'current-user'
    ELSE
      CASE WHEN UserRelationOfUserToHost.status IS NULL THEN 'not-friends'
      ELSE UserRelationOfUserToHost.status
      END
    END AS fromYouToThem
    FROM TifEventView
    LEFT JOIN userRelationships UserRelationOfHostToUser
      ON TifEventView.hostId = UserRelationOfHostToUser.fromUserId AND UserRelationOfHostToUser.toUserId = :userId
    LEFT JOIN userRelationships UserRelationOfUserToHost
      ON UserRelationOfUserToHost.fromUserId = :userId AND UserRelationOfUserToHost.toUserId = TifEventView.hostId
      `
  export const ATTENDANCE_INNER_JOIN =
    "INNER JOIN eventAttendance ea ON ea.eventId = TifEventView.id"

  const NOT_BLOCKED_CLAUSES = `
    (UserRelationOfHostToUser.status IS NULL OR UserRelationOfHostToUser.status <> 'blocked')
    AND (UserRelationOfUserToHost.status IS NULL OR UserRelationOfUserToHost.status <> 'blocked')
    `

  const BASE_WHERE_CLAUSES = `
    TifEventView.endedDateTime IS NULL
    AND ${NOT_BLOCKED_CLAUSES}
    `

  const BASE_WITH_NON_PAST_EVENTS_WHERE_CLAUSES = `
    TifEventView.endDateTime > :currentTimestamp
    AND ${BASE_WHERE_CLAUSES}
    `

  export const BASE_WITH_NON_PAST_EVENTS_WHERE = `
    WHERE
      ${BASE_WITH_NON_PAST_EVENTS_WHERE_CLAUSES}
    `

  const USER_ATTENDANCE_WHERE_CLAUSES = `
    ea.userId = :attendingUserId
    AND ea.role IN ('hosting', 'attending')
    `

  export const USER_ATTENDANCE_WITH_NON_PAST_EVENTS_WHERE = `
    WHERE
    ${BASE_WITH_NON_PAST_EVENTS_WHERE_CLAUSES}
    AND ${USER_ATTENDANCE_WHERE_CLAUSES}
  `

  export const MAX_SECONDS_TO_START_WITH_USER_ATTENDANCE_WHERE = `
      ${USER_ATTENDANCE_WITH_NON_PAST_EVENTS_WHERE}
      AND TIMESTAMPDIFF(SECOND, :currentTimestamp, TifEventView.startDateTime) < :maxSecondsToStart
      `

  export const DATE_RANGE_WITH_USER_ATTENDANCE_WHERE = `
    WHERE
      ${NOT_BLOCKED_CLAUSES}
      AND ${USER_ATTENDANCE_WHERE_CLAUSES}
      AND TifEventView.startDateTime <= :endDateTime
      AND TifEventView.endDateTime >= :startDateTime
      `

  export const TIMELINE_FORWARDS_WHERE = `
    WHERE
      ${NOT_BLOCKED_CLAUSES}
      AND ${USER_ATTENDANCE_WHERE_CLAUSES}
      AND TifEventView.endDateTime >= :startDateTime
      `

  export const TIMELINE_BACKWARDS_WHERE = `
    WHERE
      ${NOT_BLOCKED_CLAUSES}
      AND ${USER_ATTENDANCE_WHERE_CLAUSES}
      AND TifEventView.endDateTime < :startDateTime
      `

  export const GEOSPATIAL_WHERE = `
    WHERE
      ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(TifEventView.longitude, TifEventView.latitude)) < :radius
      AND ${BASE_WITH_NON_PAST_EVENTS_WHERE_CLAUSES}
    `
  export const ORDER_BY_START_TIME = "ORDER BY TifEventView.startDateTime"
}
