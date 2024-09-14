import express, { Express } from "express"
import request from "supertest"
import { z } from "zod"

describe.skip("validateRequest", () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  test("should validate body successfully", async () => {
    const bodySchema = z.object({
      name: z.string()
    })

    app.post("/test", validateRequest({ bodySchema }), (req, res) => {
      res.status(200).send(req.body)
    })

    const response = await request(app).post("/test").send({
      name: "John"
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      name: "John"
    })
  })

  test("should return 400 for invalid body", async () => {
    const bodySchema = z.object({
      name: z.string()
    })

    app.post("/test", validateRequest({ bodySchema }), (req, res) => {
      res.sendStatus(200)
    })

    const response = await request(app).post("/test").send({
      name: 1234
    })

    expect(response.status).toBe(400)
  })

  test("should return 400 when unexpected body is provided and no body schema is defined", async () => {
    app.post("/test", validateRequest({}), (req, res) => {
      res.sendStatus(200)
    })

    const response = await request(app).post("/test").send({
      unexpected: "data"
    })

    expect(response.status).toBe(400)
  })

  test("should validate both body and query successfully", async () => {
    const bodySchema = z.object({
      name: z.string()
    })

    const querySchema = z.object({
      id: z.string()
    })

    app.post(
      "/test",
      validateRequest({ bodySchema, querySchema }),
      (req, res) => {
        res.status(200).send({ body: req.body, query: req.query })
      }
    )

    const response = await request(app).post("/test?id=30").send({
      name: "John"
    })

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
    const bodySchema = z.object({
      name: z.string()
    })

    const querySchema = z.object({
      age: z.number()
    })

    app.post(
      "/test",
      validateRequest({ bodySchema, querySchema }),
      (req, res) => {
        res.sendStatus(200)
      }
    )

    const response = await request(app).post("/test?age=thirty").send({
      name: "John"
    })

    expect(response.status).toBe(400)
  })
})
