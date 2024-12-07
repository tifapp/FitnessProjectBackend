export namespace UserEventSQL {
  export const BASE = `
    SELECT TifEventView.*,
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
    "INNER JOIN eventAttendance ea ON ea.userId = :attendingUserId"

  const BASE_WHERE_CLAUSES = `
    TifEventView.endDateTime > NOW()
    AND TifEventView.endedDateTime IS NULL
    AND (UserRelationOfHostToUser.status IS NULL OR UserRelationOfHostToUser.status <> 'blocked')
    AND (UserRelationOfUserToHost.status IS NULL OR UserRelationOfUserToHost.status <> 'blocked')
    `
  export const BASE_WHERE = `
    WHERE
      ${BASE_WHERE_CLAUSES}
    `
  export const GEOSPATIAL_WHERE = `
    WHERE
      ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(TifEventView.longitude, TifEventView.latitude)) < :radius
      AND ${BASE_WHERE_CLAUSES}
    `
  export const ORDER_BY_START_TIME = "ORDER BY TifEventView.startDateTime"
}
