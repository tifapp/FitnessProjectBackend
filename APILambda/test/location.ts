import { conn } from "TiFBackendUtils"
import { LocationCoordinate2D } from "TiFShared/domain-models/LocationCoordinate2D"
import { addLocationToDB } from "../../GeocodingLambda/utils"

export const addMockLocationToDB = (coords: LocationCoordinate2D) =>
  addLocationToDB(
    conn,
    {
      ...coords,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      streetNumber: "1234"
    },
    "Sample/Timezone"
  )
