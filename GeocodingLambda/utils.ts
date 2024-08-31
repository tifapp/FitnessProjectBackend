import {
  LocationClient,
  Place,
  SearchPlaceIndexForPositionCommand
} from "@aws-sdk/client-location"
import { AWSEnvVars, MySQLExecutableDriver } from "TiFBackendUtils"
// https://github.com/evansiroky/node-geo-tz/commit/1b11eda7824a1e6dbc0b0ff65bfea1f50c20d3fa
import { find } from "geo-tz/dist/find-now"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { Placemark } from "TiFShared/domain-models/Placemark"
import type { NullablePartial } from "TiFShared/lib/Types/HelperTypes"

const locationClient = new LocationClient({ region: AWSEnvVars.AWS_REGION })

export type FlattenedLocation = LocationCoordinate2D & Placemark

/**
 * Converts an AWS location search result into placemark format.
 *
 * @param {LatLng} location The latitude and longitude of the search result.
 * @param {Place | undefined} place The location search result from AWS.
 * @returns {Placemark} The location search result in placemark format.
 */
export const AddressSearchResultToFlattenedLocation = (
  location: LocationCoordinate2D,
  place?: Place
): FlattenedLocation => {
  return {
    ...location,
    name: place?.Label,
    city:
      place?.Neighborhood ??
      place?.Municipality ??
      place?.SubRegion,
    // country: place?.Country, // TODO: Need to derive the full country name
    country: undefined,
    street: place?.Street,
    streetNumber: place?.AddressNumber,
    postalCode: place?.PostalCode,
    region: place?.Region,
    isoCountryCode: place?.Country
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

  return AddressSearchResultToFlattenedLocation(
    location,
    response.Results?.[0]?.Place
  )
}

export const checkExistingPlacemarkInDB = (
  conn: MySQLExecutableDriver,
  location: LocationCoordinate2D
) =>
  conn
    .queryHasResults(
      `
    SELECT TRUE FROM location WHERE latitude = :latitude AND longitude = :longitude LIMIT 1
    `,
      location
    )
    .inverted()
    .withFailure("placemark-already-exists" as const)

export const addLocationToDB = (conn: MySQLExecutableDriver, {
  latitude,
  longitude,
  name = null,
  city = null,
  country = null,
  street = null,
  streetNumber = null,
  postalCode = null,
  region = null,
  isoCountryCode = null
}: NullablePartial<FlattenedLocation>, timezoneIdentifier: string) =>
  conn.executeResult(
    `
      INSERT INTO location (name, city, country, street, streetNumber, postalCode, latitude, longitude, timezoneIdentifier, isoCountryCode)
      VALUES (:name, :city, :country, :street, :streetNumber, :postalCode, :latitude, :longitude, :timezoneIdentifier, :isoCountryCode)
    `,
    { timezoneIdentifier, latitude, longitude, name, city, country, street, streetNumber, postalCode, region, isoCountryCode }
  )

export const getTimeZone = (coordinate: {latitude: number, longitude: number}) => {
  return find(coordinate.latitude, coordinate.longitude)
}
