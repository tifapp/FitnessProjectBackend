/* eslint-disable @typescript-eslint/naming-convention */
// keys must be regex
export default {
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
      useESM: true
    }
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  testEnvironment: "node",
  clearMocks: true,
  transform: {
    "^.+\\.(t|j)s?$": "ts-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(TiFShared|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill))"
  ],
  testPathIgnorePatterns: ["/dist/"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^TiFShared/(.*)\\.js$": "<rootDir>/node_modules/TiFShared/$1"
  },
  globalSetup: "./test/jestSetup.ts",
  // globalTeardown: "./test/jestTeardown.ts",
  testTimeout: 15000,
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
