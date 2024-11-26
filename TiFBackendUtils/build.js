/* eslint-disable @typescript-eslint/no-var-requires */
const glob = require("glob")
const esbuild = require("esbuild")
const packageJson = require("./package.json")
const { nodeExternalsPlugin } = require("esbuild-node-externals")

const devDependencies = Object.keys(packageJson.devDependencies || {})

const entryPoints = glob.sync("**/*.ts", {
  ignore: ["**/*.test.ts", "**/*.spec.ts", "test/**", "node_modules/**"]
})

esbuild.build({
  entryPoints,
  bundle: true,
  platform: "node",
  target: "node18",
  outdir: "dist",
  external: [
    ...devDependencies
  ],
  plugins: [
    nodeExternalsPlugin({
      allowList: ["@aws-crypto"]
    })
  ],
  resolveExtensions: [".ts", ".js", ".json", ".d.ts"],
  loader: { ".d.ts": "file" },
  logLevel: "info"
}).catch(() => process.exit(1))
