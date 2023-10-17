/* eslint-disable @typescript-eslint/naming-convention */
// keys must be regex
export default {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  clearMocks: true,
  transform: {
    "^.+\\.ts?$": "ts-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@planetscale|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill))"
  ],
  testPathIgnorePatterns: ["/dist/"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  globalSetup: "./setupTestUsers.ts",
  globalTeardown: "./deleteTestUsers.ts"
}
