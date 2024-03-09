/* eslint-disable import/extensions */
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi
} from "@asteasolutions/zod-to-openapi"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { z } from "zod"
import { addRoutes, createApp } from "./app.js"
import { addCognitoTokenVerification } from "./auth.js"

dotenv.config()

const lambdaEnvVarsSchema = z
  .object({
    API_SPECS_ENDPOINT: z.string().url().optional(),
    API_SPECS_LAMBDA_ID: z.string().optional()
  }).passthrough()

export const testEnvVars = lambdaEnvVarsSchema.parse(process.env)

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()

const app = createApp()
addCognitoTokenVerification(app)
addRoutes(app, {
  routeCollector: (pathPrefix) => ({ httpMethod, path, inputSchema: { pathParamsSchema: params, bodySchema: body, querySchema: query } }) => {
    registry.registerPath({
      method: httpMethod,
      path: `${pathPrefix}${path.replace(/:(\w+)/g, "{$1}")}`, // does colon param syntax work or do we have to replace it inline? + add the prefix remember
      request: {
        params,
        query,
        // TODO conditional headers
        // headers: z.object({
        //   Authorization: z.string().openapi({ example: "1212121" })
        // }),
        body: body
          // eslint-disable-next-line multiline-ternary
          ? {
          // description: "Object with user data.", TODO: Add descriptions
            content: {
              "application/json": {
                schema: body
              }
            }
          } : undefined
      },
      responses: {
        // TODO: Generate responses
        200: {
          description: "Object with user data.", // TODO: require description
          content: {
          }
        }
      },
      "x-amazon-apigateway-integration": {
        httpMethod: httpMethod.toUpperCase(),
        uri: `${testEnvVars.API_SPECS_LAMBDA_ID}:dev/invocations`,
        responses: {
          default: {
            statusCode: "200"
          }
        },
        passthroughBehavior: "when_no_match",
        contentHandling: "CONVERT_TO_TEXT",
        type: "aws_proxy"
      }
    })
  }
})

const generator = new OpenApiGeneratorV3(registry.definitions)

const specs = generator.generateDocument({
  openapi: "3.0.1",
  info: {
    title: "tifRestAPI",
    description: "API used for the TiF mobile app",
    version: new Date()
  },
  servers: [{
    url: testEnvVars.API_SPECS_ENDPOINT
  }]
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const filePath = path.join(__dirname, "./specs.json")
fs.writeFileSync(filePath, JSON.stringify(specs, null, 2))

console.log("Generated api specs successfully!")
