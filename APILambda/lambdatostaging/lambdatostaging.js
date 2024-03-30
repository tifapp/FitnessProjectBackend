import NpmExecHelper from "./lambdatostaginghelper.js"

const npmExecInstance = new NpmExecHelper()

const handleError = (output, errorMessage, dir = "../TiFBackendUtils") => {
  if (output !== 0) {
    console.error(errorMessage)
    console.log(`deleting dist folder content from ${dir}/dist`)
    cleanUp()
    process.exit(1)
  }
}

const cleanUp = () => {
  npmExecInstance.revertToPackageJsonName()
  npmExecInstance.deleteDistBuildFolders()
}

cleanUp()

const cleanInstallOutput = npmExecInstance.cleanInstall()
handleError(cleanInstallOutput, "Failed to install backend utils dependencies.")

const buildOutput = npmExecInstance.runBuild()
handleError(buildOutput, "Failed to build backend utils js.")

const runPackage = npmExecInstance.runPackageShellJS()
handleError(runPackage, "Failed to package.")

const runInstallAPILambdaDependencies = npmExecInstance.runInstallAPILambdaDependencies()
handleError(runInstallAPILambdaDependencies, "Failed to install API lambda dependencies.")

const runBuildAPILambdaZip = npmExecInstance.runBuildAPILambdaZip()
handleError(runBuildAPILambdaZip, "Failed to build APILambda zip.")

const deployLambdaToStaging = await npmExecInstance.deployLambdaToStagingAWSSdk()
handleError(deployLambdaToStaging, "Failed to deploy lambda to staging")

cleanUp()
