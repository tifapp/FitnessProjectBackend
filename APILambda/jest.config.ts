/* eslint-disable @typescript-eslint/naming-convention */
// keys must be regex
export default {
  testEnvironment: "node",
  clearMocks: true,
  transform: {
    "^.+\\.(t|j)s?$": "@swc/jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@planetscale|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill))"
  ],
  testPathIgnorePatterns: ["/dist/"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  globalSetup: "./test/jestSetup.ts",
  // globalTeardown: "./test/jestTeardown.ts",
  testTimeout: 60000,
  setupFilesAfterEnv: ["./test/setupHooks.ts"],
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
    [
      "jest-watch-suspend", {
        "suspend-on-start": true
      }
    ]
  ]
}
