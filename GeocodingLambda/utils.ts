import {
  LocationClient,
  Place,
  SearchPlaceIndexForPositionCommand
} from "@aws-sdk/client-location"
import { SQLExecutable } from "TiFBackendUtils/SQLExecutable/index.js"
import { LocationCoordinate2D, Placemark } from "TiFBackendUtils/location.js"
import { find } from "geo-tz"

const locationClient = new LocationClient({ region: process.env.AWS_REGION })

/**
 * Converts an AWS location search result into placemark format.
 *
 * @param {LatLng} location The latitude and longitude of the search result.
 * @param {Place | undefined} place The location search result from AWS.
 * @returns {Placemark} The location search result in placemark format.
 */
export const SearchForPositionResultToPlacemark = (
  location: LocationCoordinate2D,
  place: Place
): Placemark => {
  return {
    lat: location.latitude,
    lon: location.longitude,
    name: place?.Label,
    city:
      place?.Neighborhood ??
      place?.Municipality ??
      place?.SubRegion,
    // country: place?.Country, // TODO: Need to get the full country name
    street: place?.Street,
    streetNumber: place?.AddressNumber,
    postalCode: place?.PostalCode,
    region: place?.Region,
    isoCountryCode: place?.Country,
    country: undefined
  }
}

export const SearchClosestAddressToCoordinates = async (
  location: LocationCoordinate2D
) => {
  const response = await locationClient.send(
    new SearchPlaceIndexForPositionCommand({
      IndexName: "placeIndexed3975f4-dev", // environment variable?
      Position: [location.longitude, location.latitude],
      MaxResults: 1,
      Language: "en-US"
    })
  )
  if (!response.Results?.[0]?.Place) {
    throw new Error()
  }
  return SearchForPositionResultToPlacemark(
    location,
    response.Results?.[0]?.Place
  )
}

export const checkExistingPlacemarkInDB = (
  conn: SQLExecutable,
  location: LocationCoordinate2D
) =>
  conn
    .queryHasResults(
      `
    SELECT TRUE FROM location WHERE lat = :latitude AND lon = :longitude LIMIT 1
    `,
      location
    )
    .inverted()
    .withFailure("placemark-already-exists" as const)

export const addPlacemarkToDB = (conn: SQLExecutable, place: Placemark, timeZone: string) =>
  conn.queryResults(
    `
    INSERT INTO location (name, city, country, street, street_num, lat, lon, timeZone)
    VALUES (:name, :city, :country, :street, :streetNumber, :lat, :lon, :timeZone)
    `,
    { timeZone, ...place }
  )

export const getTimeZone = (coordinate: {latitude: number, longitude: number}) => {
  return find(coordinate.latitude, coordinate.longitude)
}
