
import AWS from 'aws-sdk';
const eventbridge = new AWS.EventBridge({apiVersion: '2023-04-20'});

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