import { conn } from "TiFBackendUtils"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { Placemark } from "TiFShared/domain-models/Placemark"
import { failure, success } from "TiFShared/lib/Result"
import { resetDB } from "../TiFBackendUtils/test/MySQLDriver/dbHelpers"
import { handler } from "./index"

const testCoordinates: EventEditLocation = {
  type: "coordinate",
  value: {
    latitude: 36.99813840222285,
    longitude: -122.05564377465653
  }
}

const testPlacemark: EventEditLocation = {
  type: "placemark",
  value: {
    city: "Westside",
    isoCountryCode: "USA",
    name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
    postalCode: "95064",
    street: "Hagar Dr",
    streetNumber: "420"
  }
}

describe("Geocoding lambda tests", () => {
  it("Should insert a placemark with the proper lat/lon with the given address", async () => {
    await resetDB()

    const result = await handler(testPlacemark)

    expect(result).toMatchObject(
      {
        status: "success",
        value: {
          coordinate: {
            latitude: expect.closeTo(testCoordinates.value.latitude),
            longitude: expect.closeTo(testCoordinates.value.longitude)
          },
          placemark: {
            city: "Westside",
            isoCountryCode: "USA",
            name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
            postalCode: "95064",
            street: "Hagar Dr",
            streetNumber: "420"
          }
        }
      }
    )

    const address = await conn.queryFirstResult<Placemark>(
      "SELECT * FROM location WHERE name = :name",
      { name: testPlacemark.value.name }
    )
    expect(address.value).toMatchObject({
      city: "Westside",
      isoCountryCode: "USA",
      name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
      postalCode: "95064",
      street: "Hagar Dr",
      streetNumber: "420",
      timezoneIdentifier: "America/Los_Angeles",
      latitude: expect.closeTo(testCoordinates.value.latitude),
      longitude: expect.closeTo(testCoordinates.value.longitude)
    })
  })

  it("Should return when a placemark with the given address already exists", async () => {
    const result = await handler(testPlacemark)

    expect(result).toMatchObject(
      {
        status: "success",
        value: {
          coordinate: {
            latitude: expect.closeTo(testCoordinates.value.latitude),
            longitude: expect.closeTo(testCoordinates.value.longitude)
          },
          placemark: {
            city: "Westside",
            isoCountryCode: "USA",
            name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
            postalCode: "95064",
            street: "Hagar Dr",
            streetNumber: "420",
            timezoneIdentifier: "America/Los_Angeles"
          }
        }
      }
    )
  })

  it("Should insert a placemark with the proper address with the given lat/lon", async () => {
    await resetDB()

    const result = await handler(testCoordinates)

    expect(result).toMatchObject(
      {
        status: "success",
        value: {
          coordinate: {
            latitude: expect.closeTo(testCoordinates.value.latitude),
            longitude: expect.closeTo(testCoordinates.value.longitude)
          },
          placemark: {
            city: "Westside",
            country: undefined,
            isoCountryCode: "USA",
            name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
            postalCode: "95064",
            region: "California",
            street: "Hagar Dr",
            streetNumber: "420"
          }
        }
      }
    )

    const address = await conn.queryFirstResult<Placemark>(
      "SELECT * FROM location WHERE latitude = :latitude AND longitude = :longitude",
      { latitude: 36.9981384, longitude: -122.0556438 }
    )
    expect(address.value).toMatchObject({
      city: "Westside",
      isoCountryCode: "USA",
      name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
      postalCode: "95064",
      street: "Hagar Dr",
      streetNumber: "420",
      timezoneIdentifier: "America/Los_Angeles",
      latitude: expect.closeTo(testCoordinates.value.latitude),
      longitude: expect.closeTo(testCoordinates.value.longitude)
    })
  })

  it("Should return when a placemark with the given coordinates already exist", async () => {
    const result = await handler(testCoordinates)

    expect(result).toMatchObject(
      {
        status: "success",
        value: {
          coordinate: {
            latitude: expect.closeTo(testCoordinates.value.latitude),
            longitude: expect.closeTo(testCoordinates.value.longitude)
          },
          placemark: {
            city: "Westside",
            isoCountryCode: "USA",
            name: "420 Hagar Dr, Santa Cruz, CA 95064, United States",
            postalCode: "95064",
            street: "Hagar Dr",
            streetNumber: "420",
            timezoneIdentifier: "America/Los_Angeles"
          }
        }
      }
    )
  })

  afterAll(() => conn.closeConnection())
})
