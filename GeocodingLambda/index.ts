/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import { LocationCoordinate2D, Retryable, SearchClosestAddressToCoordinates, exponentialFunctionBackoff } from "TiFBackendUtils"
import { addPlacemarkToDB, checkExistingPlacemarkInDB } from "./utils.js"

interface LocationSearchRequest extends Retryable { location: LocationCoordinate2D }

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler: any = exponentialFunctionBackoff<LocationSearchRequest, string>(async (event: LocationSearchRequest) => {
  const placemarkExists = await checkExistingPlacemarkInDB({ latitude: parseFloat(event.location.latitude.toFixed(10)), longitude: parseFloat(event.location.longitude.toFixed(10)) })

  if (placemarkExists) return `Placemark at ${JSON.stringify(event.location)} already exists`

  const place = await SearchClosestAddressToCoordinates(event.location)

  await addPlacemarkToDB(place)

  return `Placemark at ${JSON.stringify(event.location)} successfully inserted. Address is ${JSON.stringify(place)}`
})
