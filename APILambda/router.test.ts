import express, { Express } from "express"
import request from "supertest"
import { HTTPMethod } from "TiFShared/api"
import { z } from "zod"
import { ServerEnvironment } from "./env"
import { TiFRouter } from "./router"

describe("TiFRouter", () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use("/",
      TiFRouter({
        test1: ({ body, query }) => ({ status: 200, data: { body, query } }),
        test2: () => ({ status: 200, data: {} })
      // For testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      {} as ServerEnvironment,
      {
        test1: {
          input: {
            body: z.object({
              name: z.string()
            }),
            query: z.object({
              id: z.string()
            }).optional()
          },
          outputs: {
            status204: "no-content"
          },
          httpRequest: {
            method: "POST" as HTTPMethod,
            endpoint: "/test1"
          }
        },
        test2: {
          input: {
            body: z.object({
              name: z.string()
            })
          },
          outputs: {
            status204: "no-content"
          },
          httpRequest: {
            method: "GET" as HTTPMethod,
            endpoint: "/test2"
          }
        }
      // For testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    )
  })

  test("should validate input successfully", async () => {
    const response = await request(app).post("/test1").send({ name: "John" })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      body: {
        name: "John"
      }
    })
  })

  test("should return 400 for invalid input", async () => {
    const response = await request(app).post("/test1").send({ name: 1234 })

    expect(response.status).toBe(400)
  })

  test("should return 400 when unexpected input is provided and no input schema is defined", async () => {
    const response = await request(app).get("/test2?name=John").send()

    expect(response.status).toBe(400)
  })

  test("should validate multiple inputs successfully", async () => {
    const response = await request(app).post("/test1?id=30").send({ name: "John" })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      body: {
        name: "John"
      },
      query: {
        id: "30"
      }
    })
  })

  test("should return 400 for valid body but invalid query", async () => {
    const response = await request(app).post("/test1?age=thirty").send({ name: "John" })

    expect(response.status).toBe(400)
  })
})
