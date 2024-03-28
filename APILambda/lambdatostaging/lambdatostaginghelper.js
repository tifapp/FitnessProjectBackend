import fs from "fs";
import shell from "shelljs";
import AdmZip from 'adm-zip';
import AWS from 'aws-sdk';
import path from 'path';
import { config } from 'dotenv';
config();

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: process.env.AWS_REGION || 'us-west-2'
});

const lambda = new AWS.Lambda();
const apigateway = new AWS.APIGateway();
const TIFBACKENDUTILS_DIR = "../TiFBackendUtils";
const APILAMBDA_DIR = "../APILambda";

export default class npmExecHelper {
    deleteDistFolderContent(dir = TIFBACKENDUTILS_DIR) {
        let result;

        if (!fs.existsSync(dir)) {
            console.log(`${dir} does not exist.`);
            return 1;
        }
        const distPath = `${dir}/dist`;
        const parentDir = path.basename(path.dirname(distPath));

        if (parentDir !== 'APILambda' && parentDir !== 'TiFBackendUtils') {
            console.log(`The parent directory of 'dist' folder should be either 'APILambda' or 'TiFBackendUtils'.`);
            return 1;
        }

        console.log(`Deleting all contents from ${distPath}`);
        result = shell.rm('-rf', distPath);
        if (this.handleShellError(result)) {
            return result.code;
        }
        console.log(`Deleted contents successfully from ${distPath}`);

        if (fs.existsSync(`${distPath}.zip`)) {
            console.log(`Deleting ${distPath}.zip`);
            result = shell.rm('-rf', `${distPath}.zip`);
            if (this.handleShellError(result)) {
                return result.code;
            }
            console.log(`Deleted ${distPath}.zip successfully`);
        }
    }

    deleteDistBuildFolders() {
        this.deleteDistFolderContent(TIFBACKENDUTILS_DIR);
        this.deleteDistFolderContent(APILAMBDA_DIR);
    }

    handleShellError(result) {
        if (result.code !== 0) {
            console.error("Error:", result.stderr);
            return 1;
        }
        return 0;
    }
    revertToPackageJsonName(dir = TIFBACKENDUTILS_DIR) {
        try {
            if (!fs.existsSync(`${dir}/original-package.json`)) {
                console.log(`${dir}/original-package.json does not exist`);
                return;
            }

            fs.unlinkSync(`${dir}/package.json`);
            fs.renameSync(`${dir}/original-package.json`, `${dir}/package.json`);
        } catch (error) {
            console.log("Error:", error);
        }
    }

    removePatchPackage() {
        const packageJsonTemp = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        delete packageJsonTemp.scripts.postinstall;
        fs.writeFileSync('package.json', JSON.stringify(packageJsonTemp, null, 2));
    }

    cleanInstall() {
        try {
            console.log("1. Installing backend utils dependencies");

            let result = shell.cd(TIFBACKENDUTILS_DIR);
            if (this.handleShellError(result)) {
                return result.code;
            }

            fs.copyFileSync('package.json', 'original-package.json');

            this.removePatchPackage();
            result = shell.exec('npm ci --omit=dev');
            if (this.handleShellError(result)) {
                return result.code;
            }

            return 0;
        } catch (error) {
            console.log("Error:", error);
            return 1;
        }
    }

    runBuild() {
        try {
            console.log("2. Building backend utils js");

            let result = shell.cd(TIFBACKENDUTILS_DIR);
            if (this.handleShellError(result)) {
                return result.code;
            }
            result = shell.exec('npm run build');
            if (this.handleShellError(result)) {
                return result.code;
            }
            return 0;
        } catch (error) {
            console.log("Error:", error);
            return 1;
        }
    }

    runPackageShellJS() {
        try {

            console.log("3. Building package");

            let result = shell.cd(TIFBACKENDUTILS_DIR);
            if (this.handleShellError(result)) {
                return result.code;
            }

            shell.config.globOptions.extglob = true;

            result = shell.cp('-R', ['!(test|.github|dist|*.ts)', 'dist/']);
            if (this.handleShellError(result)) {
                return result.code;
            }
            result = shell.cd('./dist');
            if (this.handleShellError(result)) {
                return result.code;
            }
            result = shell.exec('npm pack');
            if (this.handleShellError(result)) {
                return result.code;
            }
            result = shell.cd('..');
            if (this.handleShellError(result)) {
                return result.code;
            }

            return 0;
        }

        catch (error) {
            console.log("Error:", error);
            return 1;
        }
    }

    runInstallAPILambdaDependencies() {
        try {
            console.log("4. Installing api lambda dependencies");

            let result = shell.cd('../GeocodingLambda');
            if (this.handleShellError(result)) {
                return result.code;
            }

            result = shell.exec('npm ci --omit=dev');
            if (this.handleShellError(result)) {
                return result.code;
            }

            result = shell.cd('../APILambda');
            if (this.handleShellError(result)) {
                return result.code;
            }

            result = shell.exec('npm ci');

            if (this.handleShellError(result)) {
                return result.code;
            }

            result = shell.exec('npm ci ../TiFBackendUtils/dist/TiFBackendUtils-1.0.0.tgz');
            if (this.handleShellError(result)) {
                return result.code;
            }

            return 0;
        } catch (error) {
            console.error('Error:', error);
            return 1;
        }
    }

    runBuildAPILambdaZip() {
        try {

            console.log("5. Run build API Lambda zip");

            let result = shell.cd(APILAMBDA_DIR);
            if (this.handleShellError(result)) {
                return result.code;
            }
            result = shell.exec('npm run build');
            if (this.handleShellError(result)) {
                return result.code;
            }

            result = shell.exec('npm ci --omit=dev');
            if (this.handleShellError(result)) {
                return result.code;
            }

            shell.config.globOptions.extglob = true;

            if (this.handleShellError(result)) {
                return result.code;
            }

            result = shell.cp('-R', ['!(test|.github|dist|lambdatostaging|*.ts)', 'dist/']);
            if (this.handleShellError(result)) {
                return result.code;
            }
            result = shell.cd("dist");
            if (this.handleShellError(result)) {
                return result.code;
            }

            result = shell.rm('-rf', 'test');
            if (this.handleShellError(result)) {
                return result.code;
            }

            const zip = new AdmZip();
            zip.addLocalFolder('.', 'dist');
            zip.writeZip('../dist.zip', (err) => {
                if (err) {
                    console.error('Error writing zip file:', err);
                    return 1;
                } else {
                    console.log('Zip file created successfully.');
                }
            });

            result = shell.cd("..");
            if (this.handleShellError(result)) {
                return result.code;
            }

            result = shell.exec('npm ci');
            if (this.handleShellError(result)) {
                return result.code;
            }
            return 0;

        } catch (error) {
            console.error('Error:', error);
            return 1;
        }
    }

    async deployLambdaToStagingAWSSdk() {
        try {

            console.log("6. Deploy lambda to staging");
            const stageName = "staging";

            const updateFunctionCodeParams = {
                FunctionName: 'lambdaSQLRoute',
                ZipFile: fs.readFileSync('dist.zip')
            };

            const putRestApiParams = {
                restApiId: '623qsegfb9',
                failOnWarnings: true,
                mode: 'overwrite',
                body: fs.readFileSync('swagger.json')
            };

            const createDeploymentParams = {
                restApiId: '623qsegfb9',
                stageName: stageName,
                description: 'Deployed'
            };

            try {
                await lambda.updateFunctionCode(updateFunctionCodeParams).promise();
                console.log("Successfully updated lambda");
            } catch (err) {
                console.error(err);
                return 1;
            }

            try {
                await apigateway.putRestApi(putRestApiParams).promise();
                console.log("Successfully added spec file");
            } catch (err) {
                console.error(err);
                return 1;
            }

            try {
                await apigateway.createDeployment(createDeploymentParams).promise();
                console.log("Successfully deployed");
            } catch (err) {
                console.error(err);
                return 1;
            }

            return 0;

        } catch (error) {
            console.log("Error:", error);
            return 1;
        }
    }
}