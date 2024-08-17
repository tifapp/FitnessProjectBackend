/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
import {
  conn,
  exponentialFunctionBackoff
} from "TiFBackendUtils"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D.js"
import { Result, promiseResult, success } from "TiFShared/lib/Result.js"
import { SearchClosestAddressToCoordinates, addLocationToDB, checkExistingPlacemarkInDB, getTimeZone } from "./utils.js"

interface LocationSearchRequest extends LocationCoordinate2D {}

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler: any = exponentialFunctionBackoff<
  LocationSearchRequest,
  Result<"placemark-successfully-inserted", "placemark-already-exists">
>(async ({ latitude, longitude }: LocationCoordinate2D) => {
  console.log("checking address for lat/lon ", latitude, longitude)

  return checkExistingPlacemarkInDB(conn, {
    // WARN: remember to keep precision in sync with the type of lat/lon in the db
    latitude: parseFloat(latitude.toFixed(7)),
    longitude: parseFloat(longitude.toFixed(7))
  })
    .flatMapSuccess(() => {
      console.log("checking aws geocoder")
      return promiseResult(
        SearchClosestAddressToCoordinates({
          latitude,
          longitude
        }).then(locationInfo => success(locationInfo))
      )
    }
    )
    .flatMapSuccess((locationInfo) => {
      console.log("aws placemark is ", JSON.stringify(locationInfo, null, 2))
      console.log("checking timezone")
      // rely on geo-tz timezone instead of AWS timezone to align with front-end data
      const timezoneIdentifier = getTimeZone({ latitude, longitude })[0]
      console.log("timezone is ", timezoneIdentifier)
      if (!timezoneIdentifier) { // should we throw if no address exists? ex. pacific ocean
        throw new Error(`Could not find timezone for ${JSON.stringify(locationInfo)}.`)
      }
      return addLocationToDB(conn, locationInfo, timezoneIdentifier)
    })
    .mapSuccess(() => "placemark-successfully-inserted" as const)
}
)
