import { Place } from "@aws-sdk/client-location"
import { AddressSearchResultToFlattenedLocation } from "./utils"

describe("AddressSearchResultToFlattenedLocation", () => {
  test("Should convert a Place object to a Placemark correctly", () => {
    const coordinate = { latitude: 12.34, longitude: 56.78 }
    const place = {
      Label: "Sample Location",
      Neighborhood: "Sample Neighborhood",
      Municipality: "Sample City",
      SubRegion: "Sample SubRegion",
      Country: "Sample Country",
      Region: "Sample Region",
      Street: "Sample Street",
      AddressNumber: "1234",
      UnitNumber: "5678"
    } as Place

    expect(AddressSearchResultToFlattenedLocation(coordinate, place)).toEqual({
      latitude: 12.34,
      longitude: 56.78,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: undefined,
      isoCountryCode: "Sample Country",
      postalCode: undefined,
      region: "Sample Region",
      street: "Sample Street",
      streetNumber: "1234"
    })
  })

  test("Should use fallback values for missing Place properties", () => {
    const coordinate = { latitude: 12.34, longitude: 56.78 }
    const place = {} as Place

    expect(AddressSearchResultToFlattenedLocation(coordinate, place)).toEqual({
      latitude: 12.34,
      longitude: 56.78,
      name: undefined,
      city: undefined,
      country: undefined,
      street: undefined,
      streetNumber: undefined
    })
  })

  test("Should use Municipality when Neighborhood is missing", () => {
    const coordinate = { latitude: 12.34, longitude: 56.78 }
    const place = {
      Municipality: "Sample City"
    } as Place

    expect(
      AddressSearchResultToFlattenedLocation(coordinate, place).city
    ).toEqual("Sample City")
  })

  test("Should use SubRegion when Neighborhood and Municipality are missing", () => {
    const coordinate = { latitude: 12.34, longitude: 56.78 }
    const place = {
      SubRegion: "Sample SubRegion"
    } as Place

    expect(
      AddressSearchResultToFlattenedLocation(coordinate, place).city
    ).toEqual("Sample SubRegion")
  })

  test("Should use Region when Country is missing", () => {
    const coordinate = { latitude: 12.34, longitude: 56.78 }
    const place = {
      Region: "Sample Region"
    } as Place

    expect(
      AddressSearchResultToFlattenedLocation(coordinate, place).country
    ).toEqual(undefined)
  })
})
