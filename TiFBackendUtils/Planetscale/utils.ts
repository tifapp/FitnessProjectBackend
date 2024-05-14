import { Field, cast, connect } from "@planetscale/database"
import fetch from "node-fetch"
import { envVars } from "./env.js"
import { PlanetScaleSQLExecutableDriver } from "./PlanetScaleDriver.js"

const tiFCasts: Record<string, (value: string | null) => unknown> = {
  INT64: (value) => parseInt(value ?? "0"), // TODO: Use BigInt primitive and find a way to serialize
  INT8: (value) => parseInt(value ?? "0") > 0,
  DATETIME: (value) => { return value ? new Date(value) : value },
  DECIMAL: (value) => { return value ? parseFloat(value) : value }
}

/**
 * Blessed
 */
export const tiFCast = (field: Field, value: string | null) => {
  if (Object.keys(tiFCasts).includes(field.type)) {
    return tiFCasts[field.type](value)
  } else {
    return cast(field, value)
  }
}

/**
 * The main planet scale connection to use.
 */
// wrap in function to take host/credentials and create connection in actual app
const planetscaleConnection = connect({
  fetch,
  cast: tiFCast, // NB: Should we use this as the global caster?
  host: envVars.DATABASE_HOST,
  username: envVars.DATABASE_USERNAME,
  password: envVars.DATABASE_PASSWORD
})

export const planetScaleExecutableDriver = new PlanetScaleSQLExecutableDriver(planetscaleConnection)
