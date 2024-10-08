import { resp } from "TiFShared/api"
import { validateAPICall } from "TiFShared/api/APIValidation"
import { envVars } from "./env"

export const validateAPIRouterCall = validateAPICall((status, value) => {
  if (status === "invalid-request") {
    return resp(400, { error: status })
  } else if (status === "invalid-response") {
    return resp(500, { error: status })
  }

  return value
}, envVars.ENVIRONMENT === "prod" ? "requestOnly" : "both")
