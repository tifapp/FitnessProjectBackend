import { LocationCoordinate2D, Placemark, conn } from "TiFBackendUtils"

require("dotenv").config()

export const checkExistingPlacemarkInDB = async (location: LocationCoordinate2D) =>
  await conn.hasResults(
    `
    SELECT TRUE FROM location WHERE lat = :latitude AND lon = :longitude LIMIT 1
    `,
    location
  )

export const addPlacemarkToDB = async (place: Placemark) =>
  await conn.execute(
    `
    INSERT INTO location (name, city, country, street, street_num, lat, lon)
    VALUES (:name, :city, :country, :street, :street_num, :lat, :lon)
    `,
    place
  )
