import request from "supertest"
import { implementTiFAPI } from "TiFShared/api/TiFAPISchema.js"
import { InputSchema } from "TiFShared/api/TransportTypes.js"
import { urlString } from "TiFShared/lib/URL.js"
import { app } from "./devIndex.js"
import { testEnvVars } from "./testEnv.js"

export const testApp = testEnvVars.API_ENDPOINT ?? app // todo replace

export const testApi =
  implementTiFAPI<{headers: Record<string, string>} & InputSchema>(
    ({ endpointSchema: { httpRequest: { method, endpoint } }, input: { headers, params, query, body } }) => {
      let requestWithHeaders = request(testApp)[method.toLowerCase()](urlString({ baseURL: new URL("/"), endpoint, params, query }))

      Object.entries(headers).forEach(([key, value]) => {
        requestWithHeaders = requestWithHeaders.set(key, value)
      })

      requestWithHeaders.send(body)
    }
  )
