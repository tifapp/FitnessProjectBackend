import { Place } from '@aws-sdk/client-location';

require('dotenv').config()

const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
const region = process.env.AWS_REGION;
const accountId = process.env.AWS_ACCOUNT_ID;
const lambdaArn = `arn:aws:lambda:${region}:${accountId}:function:${functionName}`;

/**
 * Converts an AWS location search result into placemark format.
 *
 * @param {LatLng} location The latitude and longitude of the search result.
 * @param {Place | undefined} place The location search result from AWS.
 * @returns {Placemark} The location search result in placemark format.
 */
export const SearchForPositionResultToPlacemark = (location: LatLng, place?: Place): Placemark => {  
  return ({
    lat: location.latitude,
    lon: location.longitude,
    name: place?.Label ?? "Unknown Location",
    city: place?.Neighborhood ?? place?.Municipality ?? place?.SubRegion ?? "Unknown Place",
    country: place?.Country ?? place?.Region ?? "Unknown Country",
    street: place?.Street ?? "Unknown Address",
    street_num: place?.AddressNumber ?? "",
    unit_number: place?.UnitNumber ?? "",
  })
}