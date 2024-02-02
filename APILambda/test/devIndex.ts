import { LocationCoordinate2D, SearchForPositionResultToPlacemark, promiseResult, success } from "TiFBackendUtils"
import { addBenchmarking, addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { ServerEnvironment } from "../env.js"

export const testEnv: ServerEnvironment = {
  environment: "dev",
  maxArrivals: 4,
  setProfileCreatedAttribute: () => promiseResult(success()),
  SearchForPositionResultToPlacemark: (location: LocationCoordinate2D) => {
    if (location.latitude === 0 && location.longitude === 0) {
      return undefined
    } else {
      SearchForPositionResultToPlacemark({
        latitude: location.latitude,
        longitude: location.longitude
      })
    }
  },
  callGeocodingLambda: (eventLatitude: number, eventLongitude: number) =>
    eventHandler({
      coordinate: {
        latitude: eventLatitude,
        longitude: eventLongitude
      }
    })
}

export const app = createApp()
addBenchmarking(app)
addCognitoTokenVerification(app, testEnv)
addRoutes(app, testEnv)
