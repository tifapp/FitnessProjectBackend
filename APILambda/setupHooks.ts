import { resetDB } from "./test/database.js"

/*
* Resets database before each test
*/
global.beforeEach(resetDB)
