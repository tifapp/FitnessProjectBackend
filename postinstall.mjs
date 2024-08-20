import { execSync } from "child_process"

const isCI = process.env.CI === "true"

const commands = isCI
  ? [
    "cd TiFBackendUtils && npm ci && cd ..",
    "cd APILambda && npm ci && cd ..",
    "cd GeocodingLambda && npm ci && cd .."
  ]
  : [
    "cd TiFBackendUtils && npm install && npm link TiFShared && cd ..",
    "cd APILambda && npm install && npm link TiFShared && cd ..",
    "cd GeocodingLambda && npm install && npm link TiFShared && cd .."
  ]

commands.forEach(command => {
  console.log(command)
  execSync(command, { stdio: "inherit" })
})
