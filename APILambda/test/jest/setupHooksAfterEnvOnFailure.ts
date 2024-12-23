import { logRecentLambdaMessages } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"

global.afterEach(async () => {
  if (envVars.ENVIRONMENT !== "stagingTest") {
    return
  }

  logRecentLambdaMessages("lambdaSQLRoute")
})
