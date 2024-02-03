import { LocationCoordinate2D, SearchForPositionResultToPlacemark, promiseResult, success } from "TiFBackendUtils"
import { handler } from "../../GeocodingLambda/index.js"
import { addBenchmarking, addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { ServerEnvironment } from "../env.js"

export const missingAddressTestLocation = {
  latitude: 0,
  longitude: 0
}

export const testEnv: ServerEnvironment = {
  environment: "dev",
  maxArrivals: 4,
  setProfileCreatedAttribute: () => promiseResult(success()),
  SearchForPositionResultToPlacemark: (location: LocationCoordinate2D) => {
    if (
      location.latitude === missingAddressTestLocation.latitude &&
      location.longitude === missingAddressTestLocation.longitude
    ) {
      return undefined
    } else {
      SearchForPositionResultToPlacemark({
        latitude: location.latitude,
        longitude: location.longitude
      })
    }
  },
  callGeocodingLambda: (eventLatitude: number, eventLongitude: number) =>
    handler({
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
