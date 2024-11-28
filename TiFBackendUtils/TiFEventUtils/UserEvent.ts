export const USER_EVENT_SQL = `
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

/**
 * Returns a SQL query that returns a list of events from a user's point of view.
 *
 * The user id is parameterized by the `:userId` paramater. Additionally, if the `geospatial`
 * filter is used, then the radius is parameterized by the `:radius` parameter.
 *
 * @param filter The filter to use for the query.
 * @returns
 */
export const userEventsSQL = (filter?: "geospatial") => {
  let where = `
    TifEventView.endDateTime > NOW()
    AND TifEventView.endedDateTime IS NULL
    AND (UserRelationOfHostToUser.status IS NULL OR UserRelationOfHostToUser.status <> 'blocked')
    AND (UserRelationOfUserToHost.status IS NULL OR UserRelationOfUserToHost.status <> 'blocked')
    `
  if (filter === "geospatial") {
    where =
      "ST_Distance_Sphere(POINT(:userLongitude, :userLatitude), POINT(TifEventView.longitude, TifEventView.latitude)) < :radius AND" +
      where
  }
  return `
  ${USER_EVENT_SQL}
  WHERE ${where}
  ORDER BY TifEventView.startDateTime
  `
}
