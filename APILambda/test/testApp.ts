import request from "supertest"
import { TiFAPIClientCreator } from "TiFBackendUtils"
import { envVars } from "TiFBackendUtils/env"
import { urlString } from "TiFShared/lib/URL"
import { catchAPIErrors } from "../errorHandler"
import { devApp } from "./devIndex"
import { testEnvVars } from "./testEnv"

const app = envVars.environment === "stagingTest" ? testEnvVars.API_ENDPOINT : devApp

type TestAppExtension = {auth: string}

export const testAPI = TiFAPIClientCreator<TestAppExtension>(
  catchAPIErrors,
  async ({ auth, params, query, body, endpointSchema: { httpRequest: { method, endpoint } } }) => {
    let req = request(app)[method.toLowerCase()](urlString({ endpoint, params })).query(query)

    req = req.set("authorization", auth)

    const { status, body: data } = await req.send(body)

    return { status, data }
  }
)
