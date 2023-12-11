/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import {
  LocationCoordinate2D,
  Result,
  Retryable,
  SearchClosestAddressToCoordinates,
  exponentialFunctionBackoff,
  success
} from "TiFBackendUtils"
import { addPlacemarkToDB, checkExistingPlacemarkInDB } from "./utils.js"

interface LocationSearchRequest extends Retryable {
  location: LocationCoordinate2D
}

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler: any = exponentialFunctionBackoff<
  LocationSearchRequest,
  Result<"placemark-successfully-inserted", "placemark-already-exists">
>(
  async (event: LocationSearchRequest) =>
    checkExistingPlacemarkInDB({
      latitude: parseFloat(event.location.latitude.toFixed(10)),
      longitude: parseFloat(event.location.longitude.toFixed(10))
    })
      .flatMapSuccess(async () => success(await SearchClosestAddressToCoordinates(event.location)))
      .flatMapSuccess((placemark) => addPlacemarkToDB(placemark))
      .mapSuccess(() => "placemark-successfully-inserted" as const)
)
