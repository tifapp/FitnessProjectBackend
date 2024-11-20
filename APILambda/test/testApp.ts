import request from "supertest"
import { TiFAPIClientCreator } from "TiFBackendUtils"
import { envVars } from "TiFBackendUtils/env"
import { urlString } from "TiFShared/lib/URL"
import { app as index } from "../app"
import { catchAPIErrors } from "../errorHandler"
import { testEnvVars } from "./testEnv"

const app =
  envVars.environment === "stagingTest" ? testEnvVars.API_ENDPOINT : index

type TestAppExtension = { auth: string } | { auth?: undefined; unauthenticated: true }

const testClient = TiFAPIClientCreator<TestAppExtension>(
  catchAPIErrors,
  async ({
    auth,
    params,
    query,
    body,
    endpointSchema: {
      httpRequest: { method, endpoint }
    }
  }) => {
    let req = request(app)[method.toLowerCase()](urlString({ endpoint, params }))
      .query(query)

    if (auth) {
      req = req.set("authorization", auth)
    }

    const { status, body: data } = await req.send(body)

    return { status, data }
  }
)

type StatusCodes<R> = R extends { status: infer S }
  ? S extends number
    ? S
    : never
  : never

type ResponseForStatus<R, S extends number> = Extract<R, { status: S }>

type TestAPI<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => Promise<infer R>
    ? <S extends StatusCodes<R>>(
        ...args: Args
      ) => Promise<ResponseForStatus<R, S>>
    : T[K]
}

export const testAPI = testClient as unknown as TestAPI<typeof testClient>
