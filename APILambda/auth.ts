import { Application } from "express";
import { z } from "zod";
import { ServerEnvironment } from "./env.js";

const AuthClaimsSchema = z.object({
  sub: z.string(),
  name: z.string(),
  email: z.string().email(),
  email_verified: z.boolean(),
  phone_number: z.string(), // is there a phone number type?
  phone_number_verified: z.boolean()
})

export type AuthClaims = z.infer<typeof AuthClaimsSchema>;

export const UNAUTHORIZED_RESPONSE = {
  error: "Unauthorized"
}

/**
 * Adds AWS cognito token verification to an app.
 */
export const addCognitoTokenVerification = (app: Application, env: ServerEnvironment) => {
  // TODO: - Verify JWT properly
  app.use(async (req, res, next) => {
    let auth = req.headers.Authorization
    if (env.environment === "dev") {
      auth = req.headers.authorization
    }

    if (!auth || Array.isArray(auth)) {
      console.error("invalid headers")
      res.status(401).json(UNAUTHORIZED_RESPONSE)
      return
    }
    // TODO: perform JWT verification if envType !== dev

    const token = auth.split(" ")[1] // TODO: ensure correct format of auth header ("Bearer {token}")

    try {
      // eslint-disable-next-line camelcase
      const { sub: selfId, name, email_verified, phone_number_verified } = AuthClaimsSchema.parse(JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      ))
      res.locals.selfId = selfId
      res.locals.name = name
      // eslint-disable-next-line camelcase
      res.locals.isContactInfoVerified = email_verified || phone_number_verified

      if (!res.locals.isContactInfoVerified) {
        console.error("user not verified")
        return res.status(401).json(UNAUTHORIZED_RESPONSE) // different responses?
      }

      next()
    } catch (err) {
      console.error("could not parse claims", err)
      res.status(401).json(UNAUTHORIZED_RESPONSE)
    }
  })
}
