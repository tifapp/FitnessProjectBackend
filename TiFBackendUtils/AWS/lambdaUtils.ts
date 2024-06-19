import { EventBridge } from "@aws-sdk/client-eventbridge"
import { InvocationType, Lambda } from "@aws-sdk/client-lambda"
import { AWSEnvVars } from "./env.js"

const eventbridge = new EventBridge({ apiVersion: "2023-04-20" })
const lambda = new Lambda()

const createCronExpressions = (dateString: string) => {
  const date = new Date(dateString)
  const minute = date.getUTCMinutes()
  const hour = date.getUTCHours()
  const dayOfMonth = date.getUTCDate()
  const month = date.getUTCMonth() + 1
  const year = date.getUTCFullYear()

  return `cron(${minute} ${hour} ${dayOfMonth} ${month} ? ${year})`
}

const functionName = AWSEnvVars.AWS_LAMBDA_FUNCTION_NAME
const region = AWSEnvVars.AWS_REGION
const accountId = AWSEnvVars.AWS_ACCOUNT_ID
const lambdaArn = `arn:aws:lambda:${region}:${accountId}:function:${functionName}`

export const scheduleAWSLambda = async (
  dateString: string,
  targetLambdaParams?: unknown
) => {
  const cronExpression = createCronExpressions(dateString)
  const ruleName = `${functionName}_${dateString}`.replace(/[: ]/g, "_")
  await eventbridge.putRule({
    Name: ruleName,
    ScheduleExpression: cronExpression,
    EventBusName: functionName
  })
  const targetParams = {
    Rule: ruleName,
    Targets: [
      {
        Arn: lambdaArn,
        Id: ruleName,
        Input: JSON.stringify(targetLambdaParams)
      }
    ]
  }
  return await eventbridge.putTargets(targetParams)
}

export const invokeAWSLambda = async (
  lambdaName: string,
  targetLambdaParams?: unknown
) => lambda.invoke({
  FunctionName: lambdaName,
  InvocationType: InvocationType.RequestResponse,
  Payload: JSON.stringify(targetLambdaParams)
})

export const deleteEventBridgeRule = async (event: {id: string}) => {
  await eventbridge.deleteRule({
    Name: event.id,
    EventBusName: functionName
  });
};