/* eslint-disable no-multi-str */
// address formatting

import { conn, failure, success } from "TiFBackendUtils"
import { handler } from "./index.js"

describe("Geocoding lambda tests", () => {
  it("Should insert a placemark with the proper address with the given lat/lon", async () => {
    await conn.queryResults("DELETE FROM location")

    const result = await handler({ latitude: 36.99813840222285, longitude: -122.05564377465653 })

    expect(result).toMatchObject(success("placemark-successfully-inserted"))
  })

  it("Should return when a placemark already exists", async () => {
    const result = await handler({ latitude: 36.99813840222285, longitude: -122.05564377465653 })

    expect(result).toMatchObject(failure("placemark-already-exists"))
  })
})
