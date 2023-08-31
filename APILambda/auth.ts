import { getCurrentInvoke } from "@vendia/serverless-express"
import { Application } from "express"

export const UNAUTHORIZED_RESPONSE = {
  message: "Unauthorized"
}

/**
 * Adds AWS cognito token verification to an app.
 */
export const addCognitoTokenVerification = (app: Application) => {
  // TODO: - Verify JWT properly
  app.use((_, res, next) => {
    const { event } = getCurrentInvoke()
    if (!event?.headers?.Authorization) {
      res.status(401).json(UNAUTHORIZED_RESPONSE)
      return
    }

    const token = event.headers.Authorization.split(" ")[1]

    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    )

    res.locals.selfId = claims!.sub

    next()
  })
}
