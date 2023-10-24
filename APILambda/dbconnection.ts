/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Replace with backend utils
import { Field, cast } from "@planetscale/database"

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
