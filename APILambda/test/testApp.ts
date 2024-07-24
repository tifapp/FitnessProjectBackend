import request from "supertest"
import { envVars } from "TiFBackendUtils/env"
import { implementTiFAPI } from "TiFShared/api/TiFAPISchema"
import { InputSchema } from "TiFShared/api/TransportTypes"
import { urlString } from "TiFShared/lib/URL"
import { devApp } from "./devIndex"
import { testEnvVars } from "./testEnv"

const app = envVars.environment === "stagingTest" ? testEnvVars.API_ENDPOINT : devApp

export const testApi =
  implementTiFAPI<{headers: Record<"authorization", string>} & InputSchema>(
    async ({ endpointSchema: { httpRequest: { method, endpoint } }, input: { headers, params, query, body } }) => {
      let req = request(app)[method.toLowerCase()](urlString({ endpoint, params })).query(query)

      Object.entries(headers).forEach(([key, value]) => {
        req = req.set(key, value)
      })

      const { status, body: data } = await req.send(body)

      console.log("test api returns")
      console.log(data)

      return { status, data }
    }
  )
