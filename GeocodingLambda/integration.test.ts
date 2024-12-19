import { conn } from "TiFBackendUtils"
import { resetDB } from "TiFBackendUtils/test/MySQLDriver/dbHelpers"
import { EventEditLocation } from "TiFShared/domain-models/Event"
import { handler } from "./handler"

interface TestLocation {
  name: string
  coordinate: Extract<EventEditLocation, { type?: "coordinate" }>
  placemark: Extract<EventEditLocation, { type?: "placemark" }>
}

export const testLocations: TestLocation[] = [
  {
    name: "Santa Cruz (West Coast US)",
    coordinate: {
      type: "coordinate",
      value: {
        latitude: 36.99813840222285,
        longitude: -122.05564377465653
      }
    },
    placemark: {
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
  },
  {
    name: "New York City (East Coast US)",
    coordinate: {
      type: "coordinate",
      value: {
        latitude: 40.758896,
        longitude: -73.985130
      }
    },
    placemark: {
      type: "placemark",
      value: {
        city: "Theater District-Times Square",
        isoCountryCode: "USA",
        name: "1553 Broadway, New York, NY 10036-1517, United States",
        postalCode: "10036-1517",
        region: "New York",
        street: "Broadway",
        streetNumber: "1553"
      }
    }
  },
  {
    name: "Honolulu (Hawaii)",
    coordinate: {
      type: "coordinate",
      value: {
        latitude: 21.276728,
        longitude: -157.826724
      }
    },
    placemark: {
      type: "placemark",
      value: {
        city: "Waikiki",
        isoCountryCode: "USA",
        name: "2369 Kalakaua Ave, Honolulu, HI 96815-2946, United States",
        postalCode: "96815-2946",
        region: "Hawaii",
        street: "Kalakaua Ave",
        streetNumber: "2369"
      }
    }
  },
  {
    name: "London (UK)",
    coordinate: {
      type: "coordinate",
      value: {
        latitude: 51.500729,
        longitude: -0.124625
      }
    },
    placemark: {
      type: "placemark",
      value: {
        city: "Westminster",
        isoCountryCode: "GBR",
        name: "Big Ben, Victoria Embankment, London, SW1A 2, United Kingdom",
        postalCode: "SW1A 2",
        region: "England",
        street: "Victoria Embankment"
      }
    }
  },
  {
    name: "Sydney Opera House (Australia)",
    coordinate: {
      type: "coordinate",
      value: {
        latitude: -33.83949,
        longitude: 151.07532
      }
    },
    placemark: {
      type: "placemark",
      value: {
        city: "Sydney Olympic Park",
        isoCountryCode: "AUS",
        name: "Bennelong Pkwy, Sydney Olympic Park NSW 2127, Australia",
        postalCode: "2127",
        region: "New South Wales",
        street: "Bennelong Pkwy"
      }
    }
  }
]

const unknownAddressTestLocation: TestLocation = {
  name: "Point Nemo (Pacific Ocean)",
  coordinate: {
    type: "coordinate",
    value: {
      latitude: -48.876667,
      longitude: -123.393333
    }
  },
  placemark: {
    type: "placemark",
    value: {}
  }
}

describe("Geocoding lambda tests", () => {
  const mockGeocoding = jest.fn()
  const mockReverseGeocoding = jest.fn()

  beforeEach(async () => {
    await resetDB()
  })

  describe("Forward geocoding (address to coordinates)", () => {
    it.each(testLocations)(
      "Should find the coordinates and save a placemark given the address of $name",
      async ({ placemark, coordinate }) => {
        const result = await handler(placemark)

        expect(result).toMatchObject({
          coordinate: {
            latitude: expect.closeTo(coordinate.value.latitude),
            longitude: expect.closeTo(coordinate.value.longitude)
          },
          placemark: expect.objectContaining(
            placemark.value
          )
        })

        const cachedResult = await handler(placemark, mockGeocoding, mockReverseGeocoding)
        expect(mockGeocoding).toHaveBeenCalledTimes(0)
        expect(mockReverseGeocoding).toHaveBeenCalledTimes(0)

        expect(cachedResult).toMatchObject({
          coordinate: {
            latitude: expect.closeTo(coordinate.value.latitude),
            longitude: expect.closeTo(coordinate.value.longitude)
          },
          placemark: expect.objectContaining(
            placemark.value
          )
        })
      }
    )

    it("Should use default coordinates given an unknown address", async () => {
      const result = await handler(unknownAddressTestLocation.placemark)

      expect(result).toMatchObject({
        coordinate: {
          latitude: -90,
          longitude: 0
        }
      })

      expect(result.placemark).toStrictEqual({})
    })
  })

  describe("Reverse geocoding (coordinates to address)", () => {
    it.each(testLocations)(
      "Should find the address and save a placemark given the coordinates of $name",
      async ({ coordinate, placemark }) => {
        const result = await handler(coordinate)

        expect(result).toMatchObject({
          coordinate: {
            latitude: expect.closeTo(coordinate.value.latitude),
            longitude: expect.closeTo(coordinate.value.longitude)
          },
          placemark: expect.objectContaining(
            placemark.value
          )
        })

        const cachedResult = await handler(coordinate, mockGeocoding, mockReverseGeocoding)
        expect(mockGeocoding).toHaveBeenCalledTimes(0)
        expect(mockReverseGeocoding).toHaveBeenCalledTimes(0)

        expect(cachedResult).toMatchObject({
          coordinate: {
            latitude: expect.closeTo(coordinate.value.latitude),
            longitude: expect.closeTo(coordinate.value.longitude)
          },
          placemark: expect.objectContaining(
            placemark.value
          )
        })
      }
    )

    it("Should use default coordinates given an unknown address", async () => {
      const result = await handler(unknownAddressTestLocation.coordinate)

      expect(result).toMatchObject({
        coordinate: {
          latitude: expect.closeTo(unknownAddressTestLocation.coordinate.value.latitude),
          longitude: expect.closeTo(unknownAddressTestLocation.coordinate.value.longitude)
        }
      })

      expect(result.placemark).toStrictEqual({
        city: undefined,
        country: undefined,
        isoCountryCode: undefined,
        name: undefined,
        postalCode: undefined,
        region: undefined,
        street: undefined,
        streetNumber: undefined
      })
    })
  })

  afterAll(() => conn.closeConnection())
})
