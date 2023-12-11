import { Application } from "express"
import { z } from "zod"
import { ServerEnvironment } from "./env.js"

const AuthClaimsSchema = z
  .object({
    sub: z.string(),
    name: z.string(),
    username: z.string(),
    "custom:profile_created": z.string().optional()
  })
  .and(
    z
      .object({
        email: z.string().email(),
        email_verified: z.boolean()
      })
      .or(
        z.object({
          phone_number: z.string(),
          phone_number_verified: z.boolean()
        })
      )
  )

export type AuthClaims = z.infer<typeof AuthClaimsSchema>

const TransformedAuthClaimsSchema = AuthClaimsSchema.transform((res) => ({
  selfId: res.sub,
  name: res.name,
  username: res.username,
  // @ts-expect-error email may be missing from claims
  email: res.email ?? undefined,
  // @ts-expect-error phone number may be missing from claims
  phoneNumber: res.phone_number ?? undefined,
  // cognito claims encode them as strings
  // @ts-expect-error email or phone number may be missing from claims
  isContactInfoVerfied: res.email_verified || res.phone_number_verified,
  doesProfileExist: res["custom:profile_created"] === "true"
}))

/**
 * Adds AWS cognito token verification to an app.
 */
export const addCognitoTokenVerification = (
  app: Application, // try a "usable" interface for middlewares
  env: ServerEnvironment
) => {
  // TODO: - Verify JWT properly
  app.use(async (req, res, next) => {
    let auth = req.headers?.Authorization
    if (env.environment === "dev") {
      auth = req.headers?.authorization
    }

    if (!auth || Array.isArray(auth)) {
      // TODO: Change error message to generic message for prod api
      return res.status(401).json({ error: "invalid-headers" })
    }
    // TODO: perform JWT verification if envType !== dev

    const token = auth.split(" ")[1] // TODO: ensure correct format of auth header ("Bearer {token}")

    console.log("claims look like ", JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()))

    try {
      // eslint-disable-next-line camelcase
      const { selfId, name, username, isContactInfoVerfied, doesProfileExist } =
        TransformedAuthClaimsSchema.parse(
          JSON.parse(Buffer.from(token.split(".")[1], "base64").toString())
        )
      res.locals.username = username
      res.locals.selfId = selfId
      res.locals.name = name
      // eslint-disable-next-line camelcase
      res.locals.isContactInfoVerified = isContactInfoVerfied
      res.locals.doesProfileExist = doesProfileExist

      if (!res.locals.isContactInfoVerified) {
        // TODO: Change error message to generic message for prod api
        return res.status(401).json({ error: "unverified-user" })
      }

      // separate attribute checker to a middleware, apply to other endpints
      const isCreatingProfile = req.url === "/user" && req.method === "POST"

      if (res.locals.doesProfileExist) {
        if (isCreatingProfile) {
          // TODO: Change error message to generic message for prod api
          return res.status(400).json({ error: "user-already-exists" })
        }
      } else {
        if (!isCreatingProfile) {
          // TODO: Change error message to generic message for prod api
          return res.status(401).json({ error: "user-does-not-exist" })
        }
      }

      next()
    } catch (err) {
      // TODO: Change error message to generic message for prod api
      return res.status(401).json({ error: "invalid-claims" })
    }
  })
}
