import { Placemark, conn, failure, success } from "TiFBackendUtils"
import { handler } from "./index.js"

const resetDB = async () => conn.executeResult("DELETE FROM location")
const testLocation = { latitude: 36.99813840222285, longitude: -122.05564377465653 }
const storedLocation = { latitude: 36.9981384, longitude: -122.0556438 } // SQL has limited precision

describe("Geocoding lambda tests", () => {
  it("Should insert a placemark with the proper address with the given lat/lon", async () => {
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
})
