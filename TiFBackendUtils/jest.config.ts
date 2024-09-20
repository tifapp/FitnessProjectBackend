export default {
  testEnvironment: "node",
  clearMocks: true,
  transform: {
    "^.+\\.(t|j)s?$": "@swc/jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(TiFShared))"
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
}
