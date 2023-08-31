import { planetscaleConnection } from "../Planetscale/utils"
import { SQLExecutable } from "./utils"

export const conn = new SQLExecutable(planetscaleConnection)
