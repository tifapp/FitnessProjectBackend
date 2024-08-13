import { conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport.js"
import { TiFAPIRouter } from "../../router.js"
import { queryUserSettings } from "./userSettingsQuery.js"

export const userSettings: TiFAPIRouter["userSettings"] = ({ context: { selfId } }) =>
  queryUserSettings(conn, selfId)
    .mapSuccess(settings => resp(200, settings))
    // TODO: Add eventpresetduration and eventpresetplacemark
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .unwrap() as any
