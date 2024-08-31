import { conn } from "TiFBackendUtils/MySQLDriver"
import { Placemark } from "TiFShared/domain-models/Placemark"
import { failure, success } from "TiFShared/lib/Result"
import { resetDB } from "../TiFBackendUtils/MySQLDriver/test/utils"
import { handler } from "./index"

const testLocation = { latitude: 36.99813840222285, longitude: -122.05564377465653 }
const storedLocation = { latitude: 36.9981384, longitude: -122.0556438 } // SQL has limited precision

const locationTableSQL =
`
CREATE TABLE IF NOT EXISTS location (
name varchar(255),
city varchar(255),
country varchar(255),
street varchar(255),
streetNumber varchar(255),
latitude decimal(10,7) NOT NULL,
longitude decimal(10,7) NOT NULL,
timezoneIdentifier varchar(255) NOT NULL,
postalCode varchar(255),
region varchar(255),
isoCountryCode varchar(255),
createdDateTime datetime NOT NULL DEFAULT current_timestamp(),
PRIMARY KEY (latitude, longitude)
)
`

describe("Geocoding lambda tests", () => {
  it("Should insert a placemark with the proper address with the given lat/lon", async () => {
    await conn.executeResult(locationTableSQL)
    await resetDB()

    const result = await handler(testLocation)

    expect(result).toMatchObject(success("placemark-successfully-inserted"))

    const address = await conn.queryFirstResult<Placemark>("SELECT * FROM location WHERE latitude = :latitude AND longitude = :longitude", { latitude: 36.9981384, longitude: -122.0556438 })
    expect(address.value).toMatchObject({
      city: "Westside",
      country: null,
      isoCountryCode: "USA",
      name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
      postalCode: "95064",
      region: null,
      street: "Hagar Dr",
      streetNumber: "420",
      timezoneIdentifier: "America/Los_Angeles",
      ...storedLocation
    })
  })

  it("Should return when a placemark already exists", async () => {
    const result = await handler(testLocation)

    expect(result).toMatchObject(failure("placemark-already-exists"))
  })

  afterAll(() => conn.closeConnection())
})
