import app from "../app";
import request from "supertest";

describe("app tests", () => {
  it("returns hello world on / GET", async () => {
    const result = await request(app).get("/");
    expect(result.text).toEqual("Hello, world!");
    expect(result.statusCode).toEqual(200);
  });
});
