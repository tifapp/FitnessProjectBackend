import type { InvokeCommandOutput } from "@aws-sdk/client-lambda"
import { PromiseResult, promiseResult, success } from "TiFShared/lib/Result"
import { AWSEnvVars } from "./env"
const {
  CloudWatchLogs
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
} = require("@aws-sdk/client-cloudwatch-logs")
const {
  fromEnv
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
} = require("@aws-sdk/credential-providers")
const {
  Lambda,
  InvocationType
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
} = require("@aws-sdk/client-lambda")
const {
  EventBridge
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
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
  targetLambdaParams?: unknown,
  defaultValue?: T
): PromiseResult<T, never> => {
  return promiseResult(
    lambda.invoke({
      FunctionName: lambdaName,
      InvocationType: InvocationType.RequestResponse,
      Payload: JSON.stringify(targetLambdaParams)
    }).then((response: InvokeCommandOutput) => {
      console.log(response)
      const payloadString = new TextDecoder("utf-8").decode(response.Payload)
      console.log(payloadString)
      return success(JSON.parse(payloadString))
    }).catch((e: unknown) => {
      console.error(e)
      return success(defaultValue)
    })
  )
}

export const deleteEventBridgeRule = async (event: { id: string }) => {
  await eventbridge.deleteRule({
    Name: event.id,
    EventBusName: functionName
  })
}

const cloudwatchlogs = new CloudWatchLogs({
  credentials: fromEnv()
})

/**
 * Logs the last few messages for a given AWS Lambda function name.
 *
 * @param awsLambdaFunctionName - The name of the AWS Lambda function.
 * @param environment - The current environment, used to control logging.
 * @param logLimit - The number of log events to fetch (default is 20).
 */
export const logRecentLambdaMessages = async (
  awsLambdaFunctionName: string,
  logLimit = 20
) => {
  const logGroupName = `/aws/lambda/${awsLambdaFunctionName}`

  try {
    const logStreamsResponse = await cloudwatchlogs.describeLogStreams({
      logGroupName,
      orderBy: "LastEventTime",
      descending: true,
      limit: 1
    })

    const logStreamName = logStreamsResponse.logStreams?.[0]?.logStreamName
    if (!logStreamName) {
      console.log("No log stream found.")
      return
    }

    const logEventsResponse = await cloudwatchlogs.getLogEvents({
      logGroupName,
      logStreamName,
      limit: logLimit
    })

    const logs = logEventsResponse.events?.map(({ timestamp, message }: {timestamp: string, message: string}) => {
      if (!timestamp || !message) {
        return "Empty Log!"
      } else {
        return `${new Date(timestamp).toISOString()} ${message.trim()}`
      }
    })

    if (logs && logs.length > 0) {
      console.log(`*****Recent logs from AWS Lambda:*****\n${logs.join("\n")}`)
    } else {
      console.log("No log events found.")
    }
  } catch (error) {
    console.error("Error fetching logs:", error)
  }
}
