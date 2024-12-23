import type { InvokeCommandOutput } from "@aws-sdk/client-lambda"
import { PromiseResult, promiseResult, success } from "TiFShared/lib/Result"
import { logger } from "TiFShared/logging"
import { AWSEnvVars } from "./env"
const {
  CloudWatchLogs
} = require("@aws-sdk/client-cloudwatch-logs")
const {
  fromEnv
} = require("@aws-sdk/credential-providers")
const {
  Lambda,
  InvocationType
} = require("@aws-sdk/client-lambda")
const {
  EventBridge
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

const log = logger("tif.backend.AWS")

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
      const payloadString = new TextDecoder("utf-8").decode(response.Payload)
      log.debug(payloadString)
      return success(JSON.parse(payloadString))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).catch((e: any) => {
      log.error(e)
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
      log.info("No log stream found.")
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
      log.trace(`*****Recent logs from AWS Lambda:*****\n${logs.join("\n")}`)
    } else {
      log.info("No log events found.")
    }
  } catch (error) {
    log.error("Error fetching logs:", { error })
  }
}
