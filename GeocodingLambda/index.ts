/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import { SearchPlaceIndexForPositionCommand } from "@aws-sdk/client-location";
import { LatLng, Placemark, SearchForPositionResultToPlacemark, conn, exponentialLambdaBackoff, locationClient } from "./utils";

//checks if placemark exists with given lat/lon
//takes in a lat/long and converts it to address
//inserts address in planetscale db
//retries if conversion fails
export const handler = exponentialLambdaBackoff(async (event: { location: LatLng }) => {
  const result = await checkExistingPlacemark({latitude: parseFloat(event.location.latitude.toFixed(10)), longitude: parseFloat(event.location.longitude.toFixed(10))});

  if (result.rows.length > 0) return `Placemark at ${JSON.stringify(event.location)} already exists`;
  
  const command = new SearchPlaceIndexForPositionCommand({
    IndexName: "placeIndexed3975f4-dev",
    Position: [event.location.longitude, event.location.latitude],
    MaxResults: 1,
    Language: "en-US",
  });
  const response = await locationClient.send(command);
  const place = SearchForPositionResultToPlacemark(event.location, response.Results?.[0].Place);

  await addPlacemark(place);
  
  return `Placemark at ${JSON.stringify(event.location)} successfully inserted. Address is ${JSON.stringify(place)}`;
});

const checkExistingPlacemark = async (location: LatLng) => 
  await conn.execute(
    `
    SELECT TRUE FROM Location WHERE lat = :latitude AND lon = :longitude LIMIT 1
    `, 
    location
  )


const addPlacemark = async (place: Placemark) => 
  await conn.execute(
    `
    INSERT INTO Location (name, city, country, street, street_num, lat, lon)
    VALUES (:name, :city, :country, :street, :street_num, :lat, :lon)
    `, 
    place
  )


