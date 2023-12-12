/* eslint-disable @typescript-eslint/naming-convention */
import dotenv from "dotenv"
import { Application } from "express"
import https from "https"

dotenv.config()

const outputChannel = "C01B7FFKDCP"

const sendMessageToSlack = (
  message: string,
  channelId = outputChannel
) => {
  const postData = JSON.stringify({
    channel: channelId,
    text: message
  })

  const options = {
    hostname: "slack.com",
    port: 443,
    path: "/api/chat.postMessage",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      Authorization: `Bearer ${process.env.SLACK_APP_ID}`
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = ""
      res.on("data", (chunk) => (body += chunk))
      res.on("end", () => resolve(JSON.parse(body)))
    })

    req.on("error", (e) => {
      console.error(e)
      reject(e)
    })
    req.write(postData)
    req.end()
  })
}

export const addErrorReporting = (app: Application) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(async (err, req, res, next) => {
    await sendMessageToSlack(`${JSON.stringify(res, null, 4)} \n ${JSON.stringify(err.stack, null, 4)}`)
  })
}
