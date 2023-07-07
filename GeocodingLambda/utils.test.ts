import { Place } from "@aws-sdk/client-location";
import { SearchForPositionResultToPlacemark, exponentialLambdaBackoff } from "./utils";

describe("exponentialLambdaBackoff", () => {
  test("Should not retry if lambda function succeeds", async () => {
    const successfulLambdaFunction = jest.fn().mockResolvedValue('success');
    const result = await exponentialLambdaBackoff(successfulLambdaFunction, 3)({retries: 0});
    expect(successfulLambdaFunction).toHaveBeenCalledTimes(1);
    expect(result).toBe('success');
  });

  test("Should retry up to maxRetries times if lambda function fails", async () => {
    const failingLambdaFunction = jest.fn().mockRejectedValue(new Error('failure'));
    
    let wrappedFunction: (event: any) => Promise<any>; // Placeholder for the wrapped function

    const mockScheduleLambda = jest.fn().mockImplementation((eventName, eventTime, arn, event) => {
      return wrappedFunction(event);
    });
    
    wrappedFunction = exponentialLambdaBackoff(failingLambdaFunction, 2, mockScheduleLambda);

    try {
      await wrappedFunction({retries: 0});
    } catch (e: any) {
      expect(failingLambdaFunction).toHaveBeenCalledTimes(3);
      expect(e.message).toBe('failure');
    }
  });
});

describe("SearchForPositionResultToPlacemark", () => {
  test("Should convert a Place object to a Placemark correctly", () => {
    const location = { latitude: 12.34, longitude: 56.78 };
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
    } as Place;

    expect(SearchForPositionResultToPlacemark(location, place)).toEqual({
      lat: 12.34,
      lon: 56.78,
      name: "Sample Location",
      city: "Sample Neighborhood",
      country: "Sample Country",
      street: "Sample Street",
      street_num: "1234",
      unit_number: "5678"
    });
  });

  test("Should use fallback values for missing Place properties", () => {
    const location = { latitude: 12.34, longitude: 56.78 };
    const place = {} as Place;

    expect(SearchForPositionResultToPlacemark(location, place)).toEqual({
      lat: 12.34,
      lon: 56.78,
      name: "Unknown Location",
      city: "Unknown Place",
      country: "Unknown Country",
      street: "Unknown Address",
      street_num: "",
      unit_number: ""
    });
  });

  test("Should use Municipality when Neighborhood is missing", () => {
    const location = { latitude: 12.34, longitude: 56.78 };
    const place = {
      Municipality: "Sample City"
    } as Place;

    expect(SearchForPositionResultToPlacemark(location, place).city).toEqual("Sample City");
  });

  test("Should use SubRegion when Neighborhood and Municipality are missing", () => {
    const location = { latitude: 12.34, longitude: 56.78 };
    const place = {
      SubRegion: "Sample SubRegion"
    } as Place;

    expect(SearchForPositionResultToPlacemark(location, place).city).toEqual("Sample SubRegion");
  });

  test("Should use Region when Country is missing", () => {
    const location = { latitude: 12.34, longitude: 56.78 };
    const place = {
      Region: "Sample Region"
    } as Place;

    expect(SearchForPositionResultToPlacemark(location, place).country).toEqual("Sample Region");
  });
});