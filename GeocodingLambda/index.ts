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
    latitude: parseFloat(latitude.toFixed(10)),
    longitude: parseFloat(longitude.toFixed(10))
  })
    .flatMapSuccess(() =>
      promiseResult(
        SearchClosestAddressToCoordinates({
          latitude,
          longitude
        }).then(placemark => success(placemark))
      ))
    .flatMapSuccess((placemark: Placemark) => {
      const timeZone = getTimeZone({ latitude, longitude })[0]
      return addPlacemarkToDB(conn, placemark, timeZone)
    })
    .mapSuccess(() => "placemark-successfully-inserted" as const)
)
