import { conn } from "TiFBackendUtils"
import { handler } from "."

describe("Geocoding lambda tests", () => {
  it("Should insert a placemark with the proper address with the given lat/lon", async () => {
    await conn.execute("DELETE FROM location")

    const result = await handler({ location: { latitude: 36.99813840222285, longitude: -122.05564377465653 } })

    expect(result).toEqual("Placemark at {\"latitude\":36.99813840222285,\"longitude\":-122.05564377465653} successfully inserted. Address is \
\{\"lat\":36.99813840222285,\
\"lon\":-122.05564377465653,\
\"name\":\"420 Hagar Dr, Santa Cruz, CA 95064, United States\",\
\"city\":\"Westside\",\
\"country\":\"USA\",\
\"street\":\"Hagar Dr\",\
\"street_num\":\"420\",\
\"unit_number\":\"\"}")
  })

  it("Should return when a placemark already exists", async () => {
    const result = await handler({ location: { latitude: 36.99813840222285, longitude: -122.05564377465653 } })

    expect(result).toEqual("Placemark at {\"latitude\":36.99813840222285,\"longitude\":-122.05564377465653} already exists")
  })
})
