import { LocationCoordinate2D, promiseResult, success } from "TiFBackendUtils"
import { handler } from "../../GeocodingLambda/index"
import { addRoutes, createApp } from "../app"
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

export const app = createApp()
addCognitoTokenVerification(app)
addRoutes(app, devTestEnv)
