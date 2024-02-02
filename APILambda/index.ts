import awsServerlessExpress, {
  getCurrentInvoke
} from "@vendia/serverless-express"
import {
  LocationCoordinate2D,
  Result,
  Retryable,
  SearchForPositionResultToPlacemark,
  addPlacemarkToDB,
  checkExistingPlacemarkInDB,
  conn,
  exponentialFunctionBackoff,
  invokeAWSLambda,
  success
} from "TiFBackendUtils"
import express, { Express } from "express"
import { addBenchmarking, addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"
import { ServerEnvironment } from "./env.js"
import { addErrorReporting } from "./errorReporting.js"
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

interface LocationSearchRequest extends Retryable {
  coordinate: LocationCoordinate2D
}

// TODO: Fix handler type, fix util dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const eventHandler: any = exponentialFunctionBackoff<
  LocationSearchRequest,
  Result<"placemark-successfully-inserted", "placemark-already-exists">
>(async (event: LocationSearchRequest) =>
  checkExistingPlacemarkInDB(conn, {
    latitude: parseFloat(event.coordinate.latitude.toFixed(10)),
    longitude: parseFloat(event.coordinate.longitude.toFixed(10))
  })
    .flatMapSuccess(async () =>
      success(
        SearchForPositionResultToPlacemark({
          latitude: event.coordinate.latitude,
          longitude: event.coordinate.longitude
        })
      )
    )
    .flatMapSuccess((placemark) => addPlacemarkToDB(conn, placemark))
    .mapSuccess(() => "placemark-successfully-inserted" as const)
)

const addEventToRequest = (app: Express) => {
  app.use((req, res, next) => {
    const { event } = getCurrentInvoke()

    // TODO: Find better solution
    for (const [key, value] of Object.entries(event)) {
      Object.defineProperty(req, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      })
    } // WARN: ensure fields in "event" do not overwrite fields in "req"

    Object.defineProperty(req, "body", {
      value: JSON.parse(req.body),
      writable: true,
      enumerable: true,
      configurable: true
    })

    next()
  })
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
}

const env: ServerEnvironment = {
  environment: "prod",
  eventStartWindowInHours: 1,
  maxArrivals: 100,
  SearchForPositionResultToPlacemark: (location: LocationCoordinate2D) =>
    SearchForPositionResultToPlacemark(location),
  callGeocodingLambda: (latitude: number, longitude: number) =>
    invokeAWSLambda("geocodingPipeline", {
      location: { latitude, longitude }
    })
}

const app = createApp()
addEventToRequest(app)
addBenchmarking(app)
addCognitoTokenVerification(app, env) // only apply to specific routes
addRoutes(app, env)
addErrorReporting(app)

export const handler = awsServerlessExpress({ app })
