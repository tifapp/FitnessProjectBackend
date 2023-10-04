import { Application } from "express"
import { z } from "zod"
import { ServerEnvironment } from "./env.js"

const AuthClaimsSchema = z.object({
  sub: z.string(),
  name: z.string()
}).and(
  z.object({
    email: z.string().email(),
    email_verified: z.string()
  }).or(
    z.object({
      phone_number: z.string(),
      phone_number_verified: z.string()
    })
  )
)

export type AuthClaims = z.infer<typeof AuthClaimsSchema>

const TransformedAuthClaimsSchema = AuthClaimsSchema.transform((res) => ({
  selfId: res.sub,
  name: res.name,
  // @ts-expect-error email may be missing from claims
  email: res.email ?? undefined,
  // @ts-expect-error phone number may be missing from claims
  phoneNumber: res.phone_number ?? undefined,
  // cognito claims encode them as strings
  // @ts-expect-error email or phone number may be missing from claims
  isContactInfoVerfied: res.email_verified === "true" || res.phone_number_verified === "true"
}))

/**
 * Adds AWS cognito token verification to an app.
 */
export const addCognitoTokenVerification = (app: Application, env: ServerEnvironment) => {
  // TODO: - Verify JWT properly
  app.use(async (req, res, next) => {
    let auth = req.headers?.Authorization
    if (env.environment === "dev") {
      auth = req.headers?.authorization
    }

    if (!auth || Array.isArray(auth)) {
      return res.status(401).json({ error: "invalid-headers" })
    }
    // TODO: perform JWT verification if envType !== dev

    const token = auth.split(" ")[1] // TODO: ensure correct format of auth header ("Bearer {token}")

    try {
      // eslint-disable-next-line camelcase
      const { selfId, name, isContactInfoVerfied } = TransformedAuthClaimsSchema.parse(JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      ))
      res.locals.selfId = selfId
      res.locals.name = name
      // eslint-disable-next-line camelcase
      res.locals.isContactInfoVerified = isContactInfoVerfied

      if (!res.locals.isContactInfoVerified) {
        // TODO: Enforce return after res.status or res.json to avoid side effects from continued execution
        return res.status(401).json({ error: "unverified-user" })
      }

      next()
    } catch (err) {
      return res.status(401).json({ error: "invalid-claims" })
    }
  })
}
