/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import {
  LocationCoordinate2D,
  Placemark,
  Result,
  Retryable,
  conn,
  exponentialFunctionBackoff,
  promiseResult,
  success
} from "TiFBackendUtils"
import { SearchClosestAddressToCoordinates, addPlacemarkToDB, checkExistingPlacemarkInDB, getTimeZone } from "./utils.js"

interface LocationSearchRequest extends Retryable, LocationCoordinate2D {}

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler: any = exponentialFunctionBackoff<
  LocationSearchRequest,
  Result<"placemark-successfully-inserted", "placemark-already-exists">
>(async ({ latitude, longitude }: LocationCoordinate2D) => {
  console.log("checking address for lat/lon ", latitude, longitude)

  let result = undefined

  try {
    result = checkExistingPlacemarkInDB(conn, {
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
          }).then(placemark => success(placemark))
        )
      }
      )
      .flatMapSuccess((placemark: Placemark) => {
        console.log("aws placemark is ", JSON.stringify(placemark, null, 2))
        console.log("checking timezone")
        // rely on geo-tz timezone instead of AWS timezone to align with front-end data
        const timezoneIdentifier = getTimeZone({ latitude, longitude })[0]
        console.log("timezone is ", timezoneIdentifier)
        if (!timezoneIdentifier) { // should we throw if no address exists? ex. pacific ocean
          throw new Error(`Could not find timezone for ${JSON.stringify(location)}.`)
        }
        return addPlacemarkToDB(conn, placemark, timezoneIdentifier)
      })
      .mapSuccess(() => "placemark-successfully-inserted" as const)
  } catch (e) {
    console.error(e)
    throw e
  }

  return result
})
