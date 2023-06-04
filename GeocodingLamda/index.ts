/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import AWS from "aws-sdk"
import {connect} from "@planetscale/database"
import { LocationClient, SearchPlaceIndexForPositionCommand } from "@aws-sdk/client-location"; // ES Modules import


export const conn = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
});

//takes in a lat/long and converts it to address
//inserts address in planetscale db
export const handler = async (event, context, callback) => {
  console.log(event)
  console.log(context)
  
  const client = new LocationClient({ region: "us-west-2" });
  const input = { // SearchPlaceIndexForPositionRequest
    IndexName: "placeIndexed3975f4-dev", 
    Position: [event.longitude, event.latitude],
    MaxResults: 1,
    Language: "en-US",
  };

  const command = new SearchPlaceIndexForPositionCommand(input);
  const response = await client.send(command);
  console.log(JSON.stringify(response.Results));
  console.log("between");
  console.log(JSON.stringify(response.Results[0].Place.Label));
  const place = response.Results[0].Place;
  const city = place.Municipality;
  const country_code = place.Country;
  const street = place.Street;
  // const street_num = place.s

  addLocation("Santa Cruz", "USA", "McHenry Service Rd");
}

const addLocation = async (
  city: string,
  country_code: string,
  street: string
  ) => {
    await conn.execute(
    `
    INSERT INTO Location (name, city, country_code, street, 
    street_num, lat, lon, eventId)
    VALUES ("name", :city, :country_code, :street, "street_num", event.longitude,
    event.latitude, 5)
   `, 
  { city, country_code, street})
}

