import { planetScaleExecutableDriver } from "../Planetscale/utils.js"
import { SQLExecutable } from "./utils.js"
export { SQLExecutable }

export const conn = new SQLExecutable(planetScaleExecutableDriver)
