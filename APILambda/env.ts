import { EnvSchema } from "TiFBackendUtils/env"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { PromiseResult } from "TiFShared/lib/Result"
import { NamedLocation } from "TiFShared/lib/Types/NamedLocation"

export type SetArrivalStatusEnvironment = {
  maxArrivals: number
}

/**
 * A type that holds all external dependencies of this server.
 *
 * This should be used to hold onto external dependencies that we have
 * no control over and thus should be stubbed in integration tests.
 *
 * Examples of this include AWS S3 buckets, or SNS/Push notification clients.
 */
export type ServerEnvironment = SetArrivalStatusEnvironment & {
  environment: EnvSchema["ENVIRONMENT"]
  eventStartWindowInHours: number
  callGeocodingLambda: (locationEdit: EventEditLocation) => PromiseResult<NamedLocation, never>
}
