import { envVars } from "TiFBackendUtils/env"
import { Express } from "express"

let server: ReturnType<Express["listen"]>

export const localhostListener = (app: Express) => {
  console.log(
    `Running TiFBackend on http://${envVars.DEV_TEST_HOST}:${envVars.DEV_TEST_PORT}`
  )
  server = app.listen(envVars.DEV_TEST_PORT, envVars.DEV_TEST_HOST)

  return app
}

export const closeLocalhostServer = () => {
  if (server) {
    server.close()
  }
}
