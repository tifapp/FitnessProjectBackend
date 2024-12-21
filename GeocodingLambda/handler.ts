/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
import { conn } from "TiFBackendUtils"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { Placemark } from "TiFShared/domain-models/Placemark"
import { promiseResult, success } from "TiFShared/lib/Result"
import {
  addLocationToDB,
  checkExistingPlacemarkInDB,
  FlattenedLocation,
  getTimeZone,
  SearchClosestAddressToCoordinatesAWS,
  SearchCoordinatesForAddressAWS
} from "./utils"

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = (
  locationEdit: EventEditLocation,
  reverseGeocodeHandler?: (coords: LocationCoordinate2D) => Promise<FlattenedLocation>,
  forwardGeocodeHandler?: (placemark: Placemark) => Promise<LocationCoordinate2D>
) => {
  // NB: cannot pass functions in aws environment, so perform the parameterization inside
  const reverseGeocode = typeof reverseGeocodeHandler === "function" ? reverseGeocodeHandler : SearchClosestAddressToCoordinatesAWS
  const forwardGeocode = typeof forwardGeocodeHandler === "function" ? forwardGeocodeHandler : SearchCoordinatesForAddressAWS

  console.log("geocoding ", locationEdit)

  return checkExistingPlacemarkInDB(conn, locationEdit)
    .observe(result => console.log("checking cached data ", result))
    .observeSuccess(result => console.log("checking cached data s ", result))
    .flatMapFailure(() =>
      (
        locationEdit.type === "coordinate"
          ? promiseResult(
            reverseGeocode(locationEdit.value).then((locationInfo) => success(locationInfo))
          )
          : promiseResult(
            forwardGeocode(locationEdit.value).then((coordinates) => success({ ...coordinates, ...locationEdit.value }))
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
    .observe(result => console.log("geocoder returns result ", result))
    .unwrap()
}
