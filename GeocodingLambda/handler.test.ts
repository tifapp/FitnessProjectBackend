import { Placemark, conn, failure, success } from "TiFBackendUtils"
import { handler } from "./index.js"

const resetDB = async () => conn.queryResults("DELETE FROM location")
const geocode = async () => handler({ latitude: 36.99813840222285, longitude: -122.05564377465653 })

describe("Geocoding lambda tests", () => {
  it("Should insert a placemark with the proper address with the given lat/lon", async () => {
    await resetDB()

    const result = await geocode()

    expect(result).toMatchObject(success("placemark-successfully-inserted"))

    const address = await conn.queryFirstResult<Placemark>("SELECT * FROM location WHERE lat = :latitude AND lon = :longitude", { latitude: 36.9981384022, longitude: -122.0556437747 })
    expect(address.value).toMatchObject({
      city: "Westside",
      country: null,
      isoCountryCode: "USA",
      lat: 36.9981384022,
      lon: -122.0556437747,
      name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
      // TODO: Rename to match shared models
      // eslint-disable-next-line @typescript-eslint/naming-convention
      postal_code: "95064",
      region: null,
      street: "Hagar Dr",
      // TODO: Rename to match shared models
      // eslint-disable-next-line @typescript-eslint/naming-convention
      street_num: "420",
      timeZone: "America/Los_Angeles"
    })
  })

  it("Should return when a placemark already exists", async () => {
    const result = await geocode()

    expect(result).toMatchObject(failure("placemark-already-exists"))
  })
})
