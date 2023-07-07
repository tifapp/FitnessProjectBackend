/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import { SearchPlaceIndexForPositionCommand } from "@aws-sdk/client-location";
import { LatLng, Placemark, SearchForPositionResultToPlacemark, conn, exponentialLambdaBackoff, locationClient } from "./utils";

//takes in a lat/long and converts it to address
//inserts address in planetscale db
//retries if conversion fails
export const handler = exponentialLambdaBackoff(async (event: { location: LatLng, retries: number }) => {
  const command = new SearchPlaceIndexForPositionCommand({
    IndexName: "placeIndexed3975f4-dev",
    Position: [event.location.longitude, event.location.latitude],
    MaxResults: 1,
    Language: "en-US",
  });
  const response = await locationClient.send(command);
  const place = SearchForPositionResultToPlacemark(event.location, response.Results?.[0].Place);

  await addPlacemark(place);
});

const addPlacemark = async (place: Placemark) => {
  await conn.execute(
    `
    INSERT INTO Location (name, city, country_code, street, street_num, lat, lon)
    VALUES (:name, :city, :country_code, :street, :street_num, :lon, :lat)
   `, 
    place
  )
}

