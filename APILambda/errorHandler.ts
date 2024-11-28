import { envVars } from "TiFBackendUtils/env"
import { APIMiddleware } from "TiFShared/api/TransportTypes"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const catchAPIErrors: APIMiddleware<any> = async (input, next) => {
  try {
    return await next(input)
  } catch (error) {
    if (envVars.ENVIRONMENT === "prod") {
      return {
        status: 500,
        data: { error: "Internal Server Error" }
      }
    }

    if (error instanceof Error) {
      return {
        status: 500,
        data: { error: error.message }
      }
    } else {
      return {
        status: 500,
        data: { error: `${error}` }
      }
    }
  }
}
