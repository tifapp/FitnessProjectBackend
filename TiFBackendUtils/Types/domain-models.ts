import { ColorString } from "TiFShared/domain-models/ColorString.js"
import { UserHandle } from "TiFShared/domain-models/User.js"

export const domainModelColumns = {
  hostHandle: UserHandle.parse,
  handle: UserHandle.parse,
  color: ColorString.parse
}
