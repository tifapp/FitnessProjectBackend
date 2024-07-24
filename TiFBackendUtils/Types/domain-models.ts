import { ColorString } from "TiFShared/domain-models/ColorString"
import { UserHandle } from "TiFShared/domain-models/User"

export const domainModelColumns = {
  hostHandle: UserHandle.parse,
  handle: UserHandle.parse,
  color: ColorString.parse
}
