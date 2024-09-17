/* eslint-disable @typescript-eslint/naming-convention */
// Env variables
import { EnvSchema } from "TiFBackendUtils/env"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { PromiseResult } from "TiFShared/lib/Result"

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
}
