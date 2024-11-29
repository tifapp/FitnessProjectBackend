import type { InvokeCommandOutput } from "@aws-sdk/client-lambda"
import { PromiseResult, promiseResult, success } from "TiFShared/lib/Result"
import { AWSEnvVars } from "./env"
const {
  Lambda,
  InvocationType
// eslint-disable-next-line @typescript-eslint/no-var-requires
} = require("@aws-sdk/client-lambda")
const {
  EventBridge
// eslint-disable-next-line @typescript-eslint/no-var-requires
} = require("@aws-sdk/client-eventbridge")

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

export const invokeAWSLambda = <T>(
  lambdaName: string,
  targetLambdaParams?: unknown
): PromiseResult<T, never> => {
  return promiseResult(
    lambda.invoke({
      FunctionName: lambdaName,
      InvocationType: InvocationType.RequestResponse,
      Payload: JSON.stringify(targetLambdaParams)
    }).then((response: InvokeCommandOutput) => {
      const payloadString = new TextDecoder("utf-8").decode(response.Payload)
      return success(JSON.parse(payloadString))
    })
  )
}

export const deleteEventBridgeRule = async (event: { id: string }) => {
  await eventbridge.deleteRule({
    Name: event.id,
    EventBusName: functionName
  })
}
