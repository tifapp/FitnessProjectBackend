/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import { LocationClient, SearchPlaceIndexForPositionCommand } from "@aws-sdk/client-location"; // ES Modules import
import { scheduleLambda } from "@layer/utils";
import { connect } from "@planetscale/database";

export const conn = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
});

//takes in a lat/long and converts it to address
//inserts address in planetscale db
export const handler = async (location: { longitude: number; latitude: number; }) => {
  const client = new LocationClient({ region: "us-west-2" });
  const input = {
    IndexName: "placeIndexed3975f4-dev", 
    Position: [location.longitude, location.latitude],
    MaxResults: 1,
    Language: "en-US",
  };

  const command = new SearchPlaceIndexForPositionCommand(input);
  try {
    const response = await client.send(command);
    const place = response.Results?.[0].Place;
  
    if (place)
      addLocation({
        lat: location.latitude,
        lon: location.longitude,
        name: place.Label ?? "Unknown Location",
        city: place.Neighborhood ?? place.Municipality ?? place.SubRegion ?? "Unknown Place",
        country: place.Country ?? place.Region ?? "Unknown Country",
        street: place.Street ?? "Unknown Address",
        street_num: place.AddressNumber ?? "",
        unit_number: place.UnitNumber ?? "",
      }
    );
  } catch (e) {
    const repeatDate = new Date();
    repeatDate.setHours(repeatDate.getHours() + 1);
    scheduleLambda(`geocodingRetry${repeatDate.toISOString()}`, repeatDate.toISOString(), "arn:aws:lambda:us-west-2:213277979580:function:geocodingPipeline", location)
  }
}

interface Location {
  lat: number;
  lon: number;
  name: string;
  city: string;
  country: string;
  street: string;
  street_num: string;
  unit_number: string;
}

const addLocation = async (place: Location) => {
  await conn.execute(
    `
    INSERT INTO Location (name, city, country_code, street, street_num, lat, lon)
    VALUES (:name, :city, :country_code, :street, :street_num, :lon, :lat)
   `, 
    place
  )
}

