import { execSync } from "child_process"

const isCI = process.env.CI === "true"

const commands = isCI
  ? [
    "cd TiFBackendUtils && npm ci && cd ..",
    "cd APILambda && npm ci && cd ..",
    "cd GeocodingLambda && npm ci && cd .."
  ]
  : [
    "cd TiFBackendUtils && npm install && cd ..",
    "cd APILambda && npm install && cd ..",
    "cd GeocodingLambda && npm install && cd .."
  ]

commands.forEach(command => {
  console.log(command)
  execSync(command, { stdio: "inherit" })
})
