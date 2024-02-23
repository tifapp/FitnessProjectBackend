import { EventBridge } from "@aws-sdk/client-eventbridge"
import { InvokeCommandInput, Lambda } from "@aws-sdk/client-lambda"
import dotenv from "dotenv"

dotenv.config()

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

const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME
const region = process.env.AWS_REGION
const accountId = process.env.AWS_ACCOUNT_ID
const lambdaArn = `arn:aws:lambda:${region}:${accountId}:function:${functionName}`

export const scheduleAWSLambda = async (
  dateString: string,
  targetLambdaParams?: unknown
) => {
  const cronExpression = createCronExpressions(dateString)
  const ruleName = `${functionName}_${dateString}`.replace(/[: ]/g, "_")
  const ruleParams = {
    Name: ruleName,
    ScheduleExpression: cronExpression
  }
  await eventbridge.putRule(ruleParams)
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
) => {
  const params = {
    FunctionName: lambdaName,
    InvocationType: "Event",
    Payload: JSON.stringify(targetLambdaParams)
  }

  return await lambda.invoke(params as InvokeCommandInput)
}
