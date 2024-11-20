import "TiFBackendUtils"
import "TiFShared/lib/Zod"
// Only used in local tests

import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { handler } from "../../GeocodingLambda/index"

export default {
  environment: "devTest",
  maxArrivals: 4,
  eventStartWindowInHours: 1,
  callGeocodingLambda: async (location: LocationCoordinate2D) =>
    handler(location)
}
