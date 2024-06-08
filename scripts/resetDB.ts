// dev use only
// eslint-disable-next-line import/extensions
import { resetDB } from "../APILambda/test/database";
import { DATABASE_NAME, conn } from "../TiFBackendUtils/SQLExecutable";

(async () => {
  await resetDB()
  await conn.executeResult(`REVOKE DROP ON \`${DATABASE_NAME}.*\` FROM 'backend'@'%';`)
})()