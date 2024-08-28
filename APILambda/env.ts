/* eslint-disable @typescript-eslint/naming-convention */
// Env variables
import { EnvSchema, LocationCoordinate2D, PromiseResult } from "TiFBackendUtils"
import { ValidatedRouteParams } from "./validation"

export type CreateUserProfileEnvironment = {
  setProfileCreatedAttribute: (userId: string) => PromiseResult<unknown, unknown>
}

export type SetArrivalStatusEnvironment = {
  maxArrivals: number,
}

/**
 * A type that holds all external dependencies of this server.
 *
 * This should be used to hold onto external dependencies that we have
 * no control over and thus should be stubbed in integration tests.
 *
 * Examples of this include AWS S3 buckets, or SNS/Push notification clients.
 */
export type ServerEnvironment = CreateUserProfileEnvironment & SetArrivalStatusEnvironment & {
  environment: EnvSchema["ENVIRONMENT"]
  eventStartWindowInHours: number
  callGeocodingLambda: (location: LocationCoordinate2D) => Promise<unknown>
  routeCollector?: (pathPrefix: string) => (params: ValidatedRouteParams) => void
}
