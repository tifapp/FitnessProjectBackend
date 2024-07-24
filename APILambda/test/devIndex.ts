import "TiFBackendUtils"
import "TiFShared/lib/Zod"

import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { promiseResult, success } from "TiFShared/lib/Result"
import { handler } from "../../GeocodingLambda/index"
import { addTiFRouter, createApp } from "../app"
import { addCognitoTokenVerification } from "../auth"
import { ServerEnvironment } from "../env"

export const devTestEnv: ServerEnvironment = {
  environment: "devTest",
  maxArrivals: 4,
  eventStartWindowInHours: 1,
  setProfileCreatedAttribute: () => promiseResult(success()),
  callGeocodingLambda: async (location: LocationCoordinate2D) =>
    handler(location)
}

export const devApp = createApp()
addCognitoTokenVerification(devApp)
addTiFRouter(devApp, devTestEnv)
