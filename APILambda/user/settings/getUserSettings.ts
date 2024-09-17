import { conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport"
import { TiFAPIRouter } from "../../router"
import { queryUserSettings } from "./userSettingsQuery"

export const userSettings: TiFAPIRouter["userSettings"] = ({ context: { selfId } }) =>
  queryUserSettings(conn, selfId)
    .observeSuccess(r => console.warn("look at this get ", r))
    .mapSuccess(settings => resp(200, settings))
    .unwrap()
