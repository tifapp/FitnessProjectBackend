import "TiFShared"

import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D.js"
import { promiseResult, success } from "TiFShared/lib/Result.js"
import { handler } from "../../GeocodingLambda/index.js"
import { addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { ServerEnvironment } from "../env.js"

export const devTestEnv: ServerEnvironment = {
  environment: "devTest",
  maxArrivals: 4,
  eventStartWindowInHours: 1,
  setProfileCreatedAttribute: () => promiseResult(success()),
  callGeocodingLambda: async (location: LocationCoordinate2D) =>
    handler(location)
}

export const app = createApp()
addCognitoTokenVerification(app)
addRoutes(app, devTestEnv)
