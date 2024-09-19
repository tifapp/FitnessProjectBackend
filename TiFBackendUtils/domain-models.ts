import "TiFShared/lib/Zod"

import { ColorString } from "TiFShared/domain-models/ColorString"
import { UserHandle } from "TiFShared/domain-models/User"

export const domainModelColumns = {
  hostHandle: UserHandle.optionalParse,
  handle: UserHandle.optionalParse,
  color: ColorString.parse
}