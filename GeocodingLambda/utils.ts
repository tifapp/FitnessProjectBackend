import { LocationCoordinate2D, Placemark, conn } from "TiFBackendUtils"
import dotenv from "dotenv"

dotenv.config()

export const checkExistingPlacemarkInDB = (
  location: LocationCoordinate2D
) =>
  conn.queryHasResults(
    `
    SELECT TRUE FROM location WHERE lat = :latitude AND lon = :longitude LIMIT 1
    `,
    location
  )
    .inverted()
    .withFailure("placemark-already-exists" as const)

export const addPlacemarkToDB = (place: Placemark) =>
  conn.queryResults(
    `
    INSERT INTO location (name, city, country, street, street_num, lat, lon)
    VALUES (:name, :city, :country, :street, :street_num, :lat, :lon)
    `,
    place
  )
