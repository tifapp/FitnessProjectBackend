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
console.log(JSON.stringify(response.Results))
console.log("between")
console.log(JSON.stringify(response.Results[0].Place.Label))

/**
 { // SearchPlaceIndexForPositionResponse
   Summary: { // SearchPlaceIndexForPositionSummary
     Position: [ // Position // required
       Number("double"),
     ],
     MaxResults: Number("int"),
     DataSource: "STRING_VALUE", // required
     Language: "STRING_VALUE",
   },
   Results: [ // SearchForPositionResultList // required
     { // SearchForPositionResult
       Place: { // Place
         Label: "STRING_VALUE",
         Geometry: { // PlaceGeometry
           Point: [
             Number("double"),
           ],
         },
         AddressNumber: "STRING_VALUE",
         Street: "STRING_VALUE",
         Neighborhood: "STRING_VALUE",
         Municipality: "STRING_VALUE",
         SubRegion: "STRING_VALUE",
         Region: "STRING_VALUE",
         Country: "STRING_VALUE",
         PostalCode: "STRING_VALUE",
         Interpolated: true || false,
         TimeZone: { // TimeZone
           Name: "STRING_VALUE", // required
           Offset: Number("int"),
         },
         UnitType: "STRING_VALUE",
         UnitNumber: "STRING_VALUE",
       },
       Distance: Number("double"), // required
       PlaceId: "STRING_VALUE",
     },
   ],
 };
 */
  //await utils.createScheduledLambda('arn:aws:lambda:us-west-2:213277979580:function:SendScheduledNotifications', "2015-06-27T00:48:05.899")
}

