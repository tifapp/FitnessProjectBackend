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
>(async ({ latitude, longitude }: LocationCoordinate2D) =>
  checkExistingPlacemarkInDB(conn, {
    // WARN: remember to keep precision in sync with the type of lat/lon in the db
    latitude: parseFloat(latitude.toFixed(7)),
    longitude: parseFloat(longitude.toFixed(7))
  })
    .flatMapSuccess(() =>
      promiseResult(
        SearchClosestAddressToCoordinates({
          latitude,
          longitude
        }).then(placemark => success(placemark))
      ))
    .flatMapSuccess((placemark: Placemark) => {
      const timezoneIdentifier = placemark.timezoneIdentifier ?? getTimeZone({ latitude, longitude })[0]
      if (!timezoneIdentifier) { // should we throw if no address exists? ex. pacific ocean
        throw new Error(`Could not find timezone for ${JSON.stringify(location)}.`)
      }
      return addPlacemarkToDB(conn, placemark, timezoneIdentifier)
    })
    .mapSuccess(() => "placemark-successfully-inserted" as const)
)
