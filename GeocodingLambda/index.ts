/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
import { conn } from "TiFBackendUtils"
import { exponentialFunctionBackoff } from "TiFBackendUtils/AWS"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { AwaitableResult, promiseResult, success } from "TiFShared/lib/Result"
import { NamedLocation } from "TiFShared/lib/Types/NamedLocation"
import {
  addLocationToDB,
  checkExistingPlacemarkInDB,
  getTimeZone,
  SearchClosestAddressToCoordinates,
  SearchCoordinatesForAddress
} from "./utils"

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler: any = exponentialFunctionBackoff<
  EventEditLocation,
  AwaitableResult<NamedLocation, never>
>((locationEdit: EventEditLocation) => {
  console.log("geocoding ", locationEdit)

  return checkExistingPlacemarkInDB(conn, locationEdit)
    .flatMapFailure(() =>
      (
        locationEdit.type === "coordinate"
          ? promiseResult(
            SearchClosestAddressToCoordinates(locationEdit.value).then((locationInfo) => success(locationInfo))
          )
          : promiseResult(
            SearchCoordinatesForAddress(locationEdit.value).then((coordinates) => success({ ...coordinates, ...locationEdit.value }))
          )
      )
        .flatMapSuccess((dbLocation) => {
          const { latitude, longitude, ...placemark } = dbLocation

          // rely on geo-tz timezone instead of AWS timezone to align with front-end data
          const timezoneIdentifier = getTimeZone({ latitude, longitude })[0]
          if (!timezoneIdentifier) {
            // should we throw if no address exists? ex. pacific ocean
            throw new Error(
              `Could not find timezone for ${JSON.stringify(dbLocation)}.`
            )
          }
          console.log("attempting to add location", locationEdit)

          return addLocationToDB(conn, dbLocation, timezoneIdentifier).withSuccess((
            {
              coordinate: {
                latitude,
                longitude
              },
              placemark
            }
          ))
        })
    )
})
