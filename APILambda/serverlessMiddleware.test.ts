import { getCurrentInvoke } from "@vendia/serverless-express"
import express, { Express } from "express"
import request from "supertest"
import { addEventToRequest } from "./serverlessMiddleware"

jest.mock("@vendia/serverless-express", () => ({
  getCurrentInvoke: jest.fn()
}))

describe("addEventToRequest middleware", () => {
  let app: Express

  beforeEach(() => {
    app = express()
    // @ts-expect-error mock
    getCurrentInvoke.mockReturnValue({
      event: {
        headers: {
          "x-custom-header": "customValue",
          "content-type": "application/json"
        },
        body: "{\"key\":\"value\"}",
        customField: "customData"
      }
    })
    addEventToRequest(
      app
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.get("/", (req: any, res) => {
      res.json({
        headers: req.headers,
        body: req.body,
        customField: req.customField
      })
    })
  })

  it("should add fields from event to the request object", async () => {
    const response = await request(app).get("/")
    expect(response.status).toBe(200)
    expect(response.body.customField).toBe("customData")
  })

  it("should normalize header keys to uppercase and merge them", async () => {
    const response = await request(app).get("/")
    expect(response.status).toBe(200)
    expect(response.body.headers["x-custom-header"]).toBe("customValue")
    expect(response.body.headers["content-type"]).toBe("application/json")
  })

  it("should parse and attach body to the request object", async () => {
    const response = await request(app).get("/")
    expect(response.status).toBe(200)
    expect(response.body.body).toEqual({ key: "value" })
  })
})
