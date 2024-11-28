import { AWSEnvVars } from "TiFBackendUtils/AWS"
import { envVars } from "TiFBackendUtils/env"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CloudWatchLogs } = require("@aws-sdk/client-cloudwatch-logs")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromEnv } = require("@aws-sdk/credential-providers")

const cloudwatchlogs = new CloudWatchLogs({
  credentials: fromEnv()
})
const logGroupName = `/aws/lambda/${AWSEnvVars.AWS_LAMBDA_FUNCTION_NAME}`

global.afterEach(async () => {
  if (envVars.ENVIRONMENT !== "stagingTest") {
    return
  }

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
      limit: 20
    })

    const logs = logEventsResponse.events?.map(({ timestamp, message }) => {
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
})
