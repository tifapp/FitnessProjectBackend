import {
  LocationClient,
  Place,
  SearchPlaceIndexForPositionCommand
} from "@aws-sdk/client-location"
import { LocationCoordinate2D, Placemark } from "../location.js"

const locationClient = new LocationClient({ region: "us-west-2" })

/**
 * Converts an AWS location search result into placemark format.
 *
 * @param {LatLng} location The latitude and longitude of the search result.
 * @param {Place | undefined} place The location search result from AWS.
 * @returns {Placemark} The location search result in placemark format.
 */
export const SearchForPositionResultToPlacemark = (
  location: LocationCoordinate2D,
  place?: Place
): Placemark => {
  return {
    lat: location.latitude,
    lon: location.longitude,
    name: place?.Label ?? "Unknown Location",
    city:
      place?.Neighborhood ??
      place?.Municipality ??
      place?.SubRegion ??
      "Unknown Place",
    country: place?.Country ?? place?.Region ?? "Unknown Country",
    street: place?.Street ?? "Unknown Address",
    street_num: place?.AddressNumber ?? "",
    unit_number: place?.UnitNumber ?? "",
    timeZone: "Sample/Timezone"
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
  return SearchForPositionResultToPlacemark(
    location,
    response.Results?.[0].Place
  )
}
