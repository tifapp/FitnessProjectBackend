import "TiFShared/lib/Math"
import "TiFShared/lib/Zod"

import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi
} from "@asteasolutions/zod-to-openapi"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { addRoutes, createApp } from "../app"
import { addCognitoTokenVerification } from "../auth"
import { testEnvVars } from "./testEnv"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
extendZodWithOpenApi(z as any)

const registry = new OpenAPIRegistry()

const app = createApp()
addCognitoTokenVerification(app)
addRoutes(app, {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  routeCollector: (pathPrefix) => ({ httpMethod, path, inputSchema: { pathParamsSchema: params, bodySchema: body, querySchema: query } }) => {
    registry.registerPath({
      method: httpMethod,
      path: `${pathPrefix}${path.replace(/:(\w+)/g, "{$1}")}`,
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
          content: {}
        }
      },
      "x-amazon-apigateway-integration": {
        httpMethod: "POST", // "For Lambda integrations, you must use the HTTP method of POST for the integration request" https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
        uri: `${testEnvVars.API_LAMBDA_ID}:stagingTest/invocations`,
        responses: {
          default: {
            // TODO: Generate responses
            statusCode: "200"
          }
        },
        passthroughBehavior: "when_no_match",
        contentHandling: "CONVERT_TO_TEXT",
        type: "aws_proxy"
      }
    })
  }
  // TODO: Fix during api refactor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any)

const generator = new OpenApiGeneratorV3(registry.definitions)

const specs = generator.generateDocument({
  openapi: "3.0.1",
  info: {
    title: "tifRestAPI",
    description: "API used for the TiF mobile app",
    version: `${new Date()}`
  },
  servers: [{
    url: `${testEnvVars.API_ENDPOINT}/{basePath}`,
    variables: {
      basePath: {
        default: "staging"
      }
    }
  }]
})

const filePath = path.join(__dirname, "../../specs.json")
fs.writeFileSync(filePath, JSON.stringify(specs, null, 2))

console.log("Generated api specs successfully!")
