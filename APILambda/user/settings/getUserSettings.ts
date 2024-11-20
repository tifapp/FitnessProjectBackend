import { conn } from "TiFBackendUtils"
import { resp } from "TiFShared/api/Transport"
import { authenticatedEndpoint } from "../../auth"
import { queryUserSettings } from "./userSettingsQuery"

export const userSettings = authenticatedEndpoint<"userSettings">(
  ({ context: { selfId } }) =>
    queryUserSettings(conn, selfId)
      .mapSuccess((settings) => resp(200, settings))
      .unwrap()
)
