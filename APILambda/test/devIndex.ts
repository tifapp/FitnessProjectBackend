import "TiFBackendUtils"
import "TiFShared/lib/Zod"
// Only used in local tests

import { handler } from "../../GeocodingLambda/index"
import { ServerEnvironment } from "../env"

module.exports = {
  environment: "devTest",
  maxArrivals: 4,
  eventStartWindowInHours: 1,
  callGeocodingLambda: handler
} as ServerEnvironment
