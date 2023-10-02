import { Field, cast, connect } from "@planetscale/database"
import { envVars } from "./env.js"
import fetch from "node-fetch"

/**
 * A cast function that turns all INT8 types into booleans.
 * This exists solely because of the tinyint type in MySQL.
 */
export const int8ToBoolCast = (field: Field, value: string | null) => {
  if (field.type === "INT8") {
    return parseInt(value ?? "0") > 0
  }
  return cast(field, value)
}

/**
 * Blessed
 */
export const tiFCast = (field: Field, value: string | null) => {
  if (field.type === "INT8") {
    return parseInt(value ?? "0") > 0
  } else if (field.type === "DATETIME" && value) {
    return new Date(value)
  } else if (field.type === "DECIMAL" && value) {
    return parseFloat(value)
  } else {
    return cast(field, value)
  }
}

/**
 * The main planet scale connection to use.
 */
// wrap in function to take host/credentials and create connection in actual app
export const planetscaleConnection = connect({
  fetch,
  cast: tiFCast, // NB: Should we use this as the global caster?
  host: envVars.DATABASE_HOST,
  username: envVars.DATABASE_USERNAME,
  password: envVars.DATABASE_PASSWORD
})
