/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import {
  LocationCoordinate2D,
  Result,
  Retryable,
  SearchForPositionResultToPlacemark,
  addPlacemarkToDB,
  checkExistingPlacemarkInDB,
  conn,
  exponentialFunctionBackoff,
  success
} from "TiFBackendUtils"
import { find } from "geo-tz"

interface LocationSearchRequest extends Retryable {
  coordinate: LocationCoordinate2D
}

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler: any = exponentialFunctionBackoff<
  LocationSearchRequest,
  Result<"placemark-successfully-inserted", "placemark-already-exists">
>(async (event: LocationSearchRequest) =>
  checkExistingPlacemarkInDB(conn, {
    latitude: parseFloat(event.coordinate.latitude.toFixed(10)),
    longitude: parseFloat(event.coordinate.longitude.toFixed(10))
  })
    .flatMapSuccess(async () =>
      success(
        SearchForPositionResultToPlacemark({
          latitude: event.coordinate.latitude,
          longitude: event.coordinate.longitude
        })
      )
    )
    .flatMapSuccess((placemark) => {
      const timeZone = find(event.coordinate.latitude, event.coordinate.longitude)[0]
      return addPlacemarkToDB(conn, placemark, timeZone)
    })
    .mapSuccess(() => "placemark-successfully-inserted" as const)
)
