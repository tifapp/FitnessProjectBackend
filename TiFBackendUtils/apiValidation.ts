import { resp } from "TiFShared/api"
import {
  APIValidationOptions,
  validateAPICall
} from "TiFShared/api/APIValidation"
import { envVars } from "./env"

export const validateAPIRouterCall = validateAPICall(
  (result) => {
    if (result.validationStatus === "invalid-request") {
      return resp(400, { error: result.validationStatus })
    } else if (result.validationStatus === "invalid-response") {
      return resp(500, { error: result.validationStatus })
    }

    return result.response
  },
  envVars.ENVIRONMENT === "prod"
    ? APIValidationOptions.Request
    : APIValidationOptions.Request | APIValidationOptions.Response
)
