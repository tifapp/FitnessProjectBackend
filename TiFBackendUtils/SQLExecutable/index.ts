import { planetscaleConnection } from "../Planetscale/utils.js"
import { SQLExecutable } from "./utils.js"

export const conn = new SQLExecutable(planetscaleConnection)
