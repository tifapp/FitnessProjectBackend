/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
import { conn } from "TiFBackendUtils"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { Placemark } from "TiFShared/domain-models/Placemark"
import { promiseResult, success } from "TiFShared/lib/Result"
import { logger } from "TiFShared/logging"
import {
  addLocationToDB,
  checkExistingPlacemarkInDB,
  FlattenedLocation,
  getTimeZone,
  SearchClosestAddressToCoordinatesAWS,
  SearchCoordinatesForAddressAWS
} from "./utils"

const log = logger("tif.backend.geocoder")

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = (
  locationEdit: EventEditLocation,
  reverseGeocodeHandler?: (coords: LocationCoordinate2D) => Promise<FlattenedLocation>,
  forwardGeocodeHandler?: (placemark: Placemark) => Promise<LocationCoordinate2D>
) => {
  log.info("Geocoding request: ", { locationEdit })

  // NB: cannot pass functions in aws environment, so perform the parameterization inside
  const reverseGeocode = typeof reverseGeocodeHandler === "function" ? reverseGeocodeHandler : SearchClosestAddressToCoordinatesAWS
  const forwardGeocode = typeof forwardGeocodeHandler === "function" ? forwardGeocodeHandler : SearchCoordinatesForAddressAWS

  return checkExistingPlacemarkInDB(conn, locationEdit)
    .observeSuccess(cachedLocation => log.debug("Matching location found in cache: ", { cachedLocation }))
    .observeFailure(() => log.debug("Location not found in cache"))
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

          log.debug("caching geocoded location: ", { dbLocation })

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
    .unwrap()
}
