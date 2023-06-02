export default {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  clearMocks: true,
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!@planetscale)"],
};
