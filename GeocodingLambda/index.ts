/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import {
  LocationCoordinate2D,
  Result,
  Retryable,
  SearchClosestAddressToCoordinates,
  addPlacemarkToDB,
  checkExistingPlacemarkInDB,
  conn,
  exponentialFunctionBackoff,
  getTimeZone,
  promiseResult,
  success
} from "TiFBackendUtils"

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
    .flatMapSuccess(() =>
      promiseResult(
        SearchClosestAddressToCoordinates({
          latitude: event.coordinate.latitude,
          longitude: event.coordinate.longitude
        }).then(placemark => success(placemark))
      ))
    .flatMapSuccess((placemark) => {
      const timeZone = getTimeZone(event.coordinate)[0]
      return addPlacemarkToDB(conn, placemark, timeZone)
    })
    .mapSuccess(() => "placemark-successfully-inserted" as const)
)
