import { conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouterExtension } from "../../router"
import { queryUserSettings } from "./userSettingsQuery"

export const userSettings: TiFAPIRouterExtension["userSettings"] = ({ context: { selfId } }) =>
  queryUserSettings(conn, selfId)
    .mapSuccess(settings => resp(200, settings))
    .unwrap()
