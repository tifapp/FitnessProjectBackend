import {
  EventBridge,
  PutTargetsCommandOutput
} from "@aws-sdk/client-eventbridge"
import { InvocationType, Lambda } from "@aws-sdk/client-lambda"
import { retryFunction } from "../Retryable/utils"
import { mockInDevTest } from "../test/mock"
import { AWSEnvVars } from "./env"

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
) =>
  lambda.invoke({
    FunctionName: lambdaName,
    InvocationType: InvocationType.RequestResponse,
    Payload: JSON.stringify(targetLambdaParams)
  })

export const deleteEventBridgeRule = async (event: { id: string }) => {
  await eventbridge.deleteRule({
    Name: event.id,
    EventBusName: functionName
  })
}

/**
 * Wraps a lambda function to add exponential backoff retry logic.
 *
 * @param {function} lambdaFunction The lambda function to wrap. This function should be asynchronous and throw an error if the operation it performs fails.
 * @param {number} maxRetries The maximum number of retries before the error is rethrown.
 * @returns {function} A new function that performs the same operation as the original function, but with exponential backoff retries.
 */
export const exponentialFunctionBackoff = <T, U>(
  asyncFn: (event: T) => Promise<PutTargetsCommandOutput | void | U>,
  maxRetries: number = 3
) =>
    retryFunction(asyncFn, maxRetries, async (afn, event: T) => {
      const parsedEvent = typeof event === "string" ? JSON.parse(event) : event
      try {
        await mockInDevTest(deleteEventBridgeRule)(parsedEvent)
        return await afn(parsedEvent.detail)
      } catch (e) {
        console.error(e)
        const retries = parsedEvent.detail.retries ?? 0
        if (retries < maxRetries) {
          const retryDelay = Math.pow(2, retries)
          const retryDate = new Date()
          retryDate.setHours(retryDate.getHours() + retryDelay)

          const newEvent = {
            ...parsedEvent,
            detail: { ...parsedEvent.detail, retries: retries + 1 }
          }
          return mockInDevTest(scheduleAWSLambda)(
            retryDate.toISOString(),
            JSON.stringify(newEvent)
          )
        } else {
          throw e
        }
      }
    })
