export default {
  testEnvironment: "node",
  clearMocks: true,
  transform: {
    "^.+\\.(t|j)s?$": "@swc/jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill))"
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^TiFShared/(.*)\\.js$": "<rootDir>/node_modules/TiFShared/$1"
  },
}
