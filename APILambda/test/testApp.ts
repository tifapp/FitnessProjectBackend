import request from "supertest"
import { envVars } from "TiFBackendUtils/env"
import { TiFAPIClientCreator } from "TiFShared/api/APIClient"
import { urlString } from "TiFShared/lib/URL"
import { devApp } from "./devIndex"
import { testEnvVars } from "./testEnv"

const app = envVars.environment === "stagingTest" ? testEnvVars.API_ENDPOINT : devApp

export const testAPI = TiFAPIClientCreator<{auth: string}>(
  async ({ auth, params, query, body, endpointSchema: { httpRequest: { method, endpoint } } }) => {
    let req = request(app)[method.toLowerCase()](urlString({ endpoint, params })).query(query)

    req = req.set("authorization", auth)

    const { status, body: data } = await req.send(body)

    return { status, data }
  }
)
