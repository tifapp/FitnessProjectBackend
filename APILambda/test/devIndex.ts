import { LocationCoordinate2D, SearchClosestAddressToCoordinates, promiseResult, success } from "TiFBackendUtils"
import { handler } from "../../GeocodingLambda/index.js"
import { addBenchmarking, addRoutes, createApp } from "../app.js"
import { addCognitoTokenVerification } from "../auth.js"
import { ServerEnvironment } from "../env.js"

export const missingAddressTestLocation = {
  latitude: 50,
  longitude: 50
}

export const testEnv: ServerEnvironment = {
  environment: "dev",
  maxArrivals: 4,
  setProfileCreatedAttribute: () => promiseResult(success()),
  SearchClosestAddressToCoordinates: async (location: LocationCoordinate2D) => {
    if (
      location.latitude === missingAddressTestLocation.latitude &&
      location.longitude === missingAddressTestLocation.longitude
    ) {
      throw new Error()
    } else {
      return SearchClosestAddressToCoordinates({
        latitude: location.latitude,
        longitude: location.longitude
      })
    }
  },
  callGeocodingLambda: async (eventLatitude: number, eventLongitude: number) =>
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
