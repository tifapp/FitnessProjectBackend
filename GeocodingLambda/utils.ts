import { AWSEnvVars } from "TiFBackendUtils/AWS"
import { MySQLExecutableDriver } from "TiFBackendUtils/MySQLDriver"
// https://github.com/evansiroky/node-geo-tz/commit/1b11eda7824a1e6dbc0b0ff65bfea1f50c20d3fa
import type { Place } from "@aws-sdk/client-location"
import { find } from "geo-tz/dist/find-now"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { Placemark } from "TiFShared/domain-models/Placemark"
import { placemarkToFormattedAddress } from "TiFShared/lib/AddressFormatting"
const {
  LocationClient,
  SearchPlaceIndexForPositionCommand,
  SearchPlaceIndexForTextCommand
// eslint-disable-next-line @typescript-eslint/no-var-requires
} = require("@aws-sdk/client-location")

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
    city: place?.Neighborhood ?? place?.Municipality ?? place?.SubRegion,
    // country: place?.Country, // TODO: Need to derive the full country name
    country: undefined,
    street: place?.Street,
    streetNumber: place?.AddressNumber,
    postalCode: place?.PostalCode,
    region: place?.Region,
    isoCountryCode: place?.Country
  }
}

export const SearchCoordinatesForAddressAWS = async (placemark: Placemark) => {
  const address = placemarkToFormattedAddress(placemark)

  if (!address) {
    throw new Error("Could not parse given placemark into address")
  }

  const response = await locationClient.send(
    new SearchPlaceIndexForTextCommand({
      IndexName: "placeIndexed3975f4-dev",
      Text: address,
      MaxResults: 1,
      Language: "en-US"
    })
  )

  const place = response.Results?.[0]?.Place
  if (place && place.Geometry?.Point) {
    const [longitude, latitude] = place.Geometry.Point
    return { latitude, longitude }
  } else {
    throw new Error("No coordinates found for the given address.")
  }
}

export const SearchClosestAddressToCoordinatesAWS = async (
  coords: LocationCoordinate2D
) => {
  const response = await locationClient.send(
    new SearchPlaceIndexForPositionCommand({
      IndexName: "placeIndexed3975f4-dev", // environment variable?
      Position: [coords.longitude, coords.latitude],
      MaxResults: 1,
      Language: "en-US"
    })
  )

  return AddressSearchResultToFlattenedLocation(
    coords,
    response.Results?.[0]?.Place
  )
}

export const checkExistingPlacemarkInDB = (
  conn: MySQLExecutableDriver,
  locationEdit: EventEditLocation
) => {
  console.log("checking existing placemark")
  console.log(locationEdit)

  return (
    locationEdit.type === "coordinate"
      ? conn
        .queryFirstResult<FlattenedLocation>(
          `
        SELECT * FROM location WHERE latitude = :latitude AND longitude = :longitude LIMIT 1
        `,
          {
          // WARN: remember to keep precision in sync with the type of lat/lon in the db
            latitude: parseFloat(locationEdit.value.latitude.toFixed(7)),
            longitude: parseFloat(locationEdit.value.longitude.toFixed(7))
          }
        )
      : conn
        .queryFirstResult<FlattenedLocation>(
          `
        SELECT * 
          FROM location
          WHERE name = :name
          OR city = :city
          OR country = :country
          OR street = :street
          OR streetNumber = :streetNumber
          OR postalCode = :postalCode
          OR region = :region
          OR isoCountryCode = :isoCountryCode
          LIMIT 1
        `,
          {
            name: locationEdit.value.name ?? undefined,
            city: locationEdit.value.city ?? undefined,
            country: locationEdit.value.country ?? undefined,
            street: locationEdit.value.street ?? undefined,
            streetNumber: locationEdit.value.streetNumber ?? undefined,
            postalCode: locationEdit.value.postalCode ?? undefined,
            region: locationEdit.value.region ?? undefined,
            isoCountryCode: locationEdit.value.isoCountryCode ?? undefined
          }
        )
  )
    .mapSuccess(({ latitude, longitude, ...placemark }) => (
      {
        coordinate: { latitude, longitude },
        placemark
      }
    ))
}

export const addLocationToDB = (
  conn: MySQLExecutableDriver,
  {
    latitude,
    longitude,
    name,
    city,
    country,
    street,
    streetNumber,
    postalCode,
    region,
    isoCountryCode
  }: FlattenedLocation,
  timezoneIdentifier: string
) =>
  conn.executeResult(
    `
      INSERT INTO location (name, city, country, street, streetNumber, postalCode, latitude, longitude, timezoneIdentifier, isoCountryCode)
      VALUES (:name, :city, :country, :street, :streetNumber, :postalCode, :latitude, :longitude, :timezoneIdentifier, :isoCountryCode)
    `,
    {
      timezoneIdentifier,
      latitude,
      longitude,
      name,
      city,
      country,
      street,
      streetNumber,
      postalCode,
      region,
      isoCountryCode
    }
  )

export const getTimeZone = (coordinate: {
  latitude: number
  longitude: number
}) => {
  return find(coordinate.latitude, coordinate.longitude)
}
