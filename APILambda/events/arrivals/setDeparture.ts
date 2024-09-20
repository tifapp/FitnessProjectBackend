import { conn } from "TiFBackendUtils"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
import { resp } from "TiFShared/api/Transport"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { UserID } from "TiFShared/domain-models/User"
import { TiFAPIRouterExtension } from "../../router"
import { upcomingEventArrivalRegionsSQL } from "./getUpcomingEvents"

export const departFromRegion: TiFAPIRouterExtension["departFromRegion"] = ({ context: { selfId }, body: { coordinate } }) =>
  conn.transaction((tx) =>
    deleteArrival(
      tx,
      selfId,
      coordinate
    )
      .flatMapSuccess(() => upcomingEventArrivalRegionsSQL(conn, selfId))
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
