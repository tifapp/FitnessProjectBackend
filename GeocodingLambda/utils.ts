import { LocationClient, Place } from '@aws-sdk/client-location';
import { connect } from "@planetscale/database";
import AWS from 'aws-sdk';

const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
const region = process.env.AWS_REGION;
const accountId = process.env.AWS_ACCOUNT_ID;
const lambdaArn = `arn:aws:lambda:${region}:${accountId}:function:${functionName}`;
const eventbridge = new AWS.EventBridge({apiVersion: '2023-04-20'});

export const locationClient = new LocationClient({ region: "us-west-2" });

export interface LatLng { 
  longitude: number; 
  latitude: number; 
}

export interface Placemark {
  lat: number;
  lon: number;
  name: string;
  city: string;
  country: string;
  street: string;
  street_num: string;
  unit_number: string;
}

export const conn = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
});

const createCronExpressions = (dateString: string) => {
  const date = new Date(dateString)
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  
  return `cron(${minute} ${hour} ${dayOfMonth} ${month} ? ${year})`;
}

export const scheduleLambda = async (name: string, dateString: string, targetLambdaARN: string, targetLambdaParams?: any) => {
  const cronExpression = createCronExpressions(dateString);
  const ruleParams = {
    Name: name,
    ScheduleExpression: cronExpression,
  };
  await eventbridge.putRule(ruleParams).promise();
  const targetParams = {
    Rule: name,
    Targets: [
      {
        Arn: targetLambdaARN,
        Id: name
      }
    ],
    Input: JSON.stringify(targetLambdaParams)
  };
  return await eventbridge.putTargets(targetParams).promise();
}

const lambda = new AWS.Lambda();

export const invokeLambda = async (lambdaName: string, targetLambdaParams?: any) => {
  var params = {
    FunctionName: lambdaName,
    InvocationType: 'Event',
    Payload: JSON.stringify(targetLambdaParams)
  };

  return await lambda.invoke(params).promise();
}

/**
 * Wraps a lambda function to add exponential backoff retry logic.
 *
 * @param {function} lambdaFunction The lambda function to wrap. This function should be asynchronous and throw an error if the operation it performs fails.
 * @param {number} maxRetries The maximum number of retries before the error is rethrown.
 * @returns {function} A new function that performs the same operation as the original function, but with exponential backoff retries.
 */
export const exponentialLambdaBackoff = (
  lambdaFunction: (event: any) => Promise<any>,
  maxRetries: number = 3,
  scheduleLambdaMethod = scheduleLambda, //parameterized for testing
) => {
  return async (event: any) => {
    try {
      return await lambdaFunction(event);
    } catch (e) {
      if (event.retries < maxRetries) {
        const retryDelay = Math.pow(2, event.retries);
        const retryDate = new Date();
        retryDate.setHours(retryDate.getHours() + retryDelay);

        const newEvent = {...event, retries: (event.retries ?? 0) + 1};
        return scheduleLambdaMethod(`geocodingRetry${retryDate.toISOString()}`, retryDate.toISOString(), lambdaArn, newEvent);
      } else {
        throw e;
      }
    }
  };
};

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