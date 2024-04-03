import { LocationCoordinate2D, promiseResult, success } from "TiFBackendUtils"
import { handler } from "../../GeocodingLambda/index.js"
import { addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { ServerEnvironment } from "../env.js"

export const testEnv: ServerEnvironment = {
  environment: "dev",
  maxArrivals: 4,
  eventStartWindowInHours: 1,
  setProfileCreatedAttribute: () => promiseResult(success()),
  callGeocodingLambda: async (location: LocationCoordinate2D) =>
    handler(location)
}

export const app = createApp()
addCognitoTokenVerification(app)
addRoutes(app, testEnv)
