import { MySQLExecutableDriver, conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D.js"
import { UserID } from "TiFShared/domain-models/User.js"
import { TiFAPIRouter } from "../../router.js"
import { upcomingEventArrivalRegionsResult } from "./getUpcomingEvents.js"

export const departFromRegion: TiFAPIRouter["departFromRegion"] = ({ context: { selfId }, body: { coordinate } }) =>
  conn.transaction((tx) =>
    deleteArrival(
      tx,
      selfId,
      coordinate
    )
      .flatMapSuccess(() => upcomingEventArrivalRegionsResult(tx, selfId))
  )
    .mapSuccess((trackableRegions) => (resp(200, { trackableRegions })))
    .unwrap()

export const deleteArrival = (
  conn: MySQLExecutableDriver,
  userId: UserID,
  coordinate: LocationCoordinate2D
) =>
  conn
    .executeResult( // TO DECIDE: if event length limit or limit in how far in advance event can be scheduled, then we can also delete outdated arrivals
      `
        DELETE FROM userArrivals
        WHERE userId = :userId
        AND latitude = :latitude
        AND longitude = :longitude         
      `,
      { userId, latitude: coordinate.latitude, longitude: coordinate.longitude }
    )
