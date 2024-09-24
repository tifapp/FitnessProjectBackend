## [View Database Schema](schema.md) ##

Todo: Add aws section
Todo: Add section for testing locally
Todo: Add table of contents

# FitnessProject

Getting Started:

# MySQL setup for Mac 

Part 1: Install Homebrew

- Open Terminal
- Run ``` 
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)```

Part 2: Install MySQL

- Update Homebrew
```brew update```
- Install MySQL
```brew install mysql```

Part 3: Secure the installation

- Run the security script ```mysql_secure_installation```

  Follow the prompts to ->

  - Set a root password
  - Remove anonymous users
  - Disallow root login remotely
  - Remove test databases
  - Reload privilege tables

Part 4: Start the MySQL Server

- In terminal, run:
  ```mysql -u root -p```
- Enter the root password


Install MySQL on Windows ->

Note: These instructions will guide you through the installation using Chocolatey. We recommended using Chocolatey for installing MySQL on Windows as it automatically handles dependency installation.

Part 1: Install Chocolatey

- Open an Administrative Command Prompt:
- Press Win + R to open the Run dialog.
- Type cmd, then press Ctrl + Shift + Enter to open the command prompt with administrative privileges.

Execute the Chocolatey Installation Command:

Copy and paste the following command into the Command Prompt:

``` Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1')) ```

Press Enter to run the command and install Chocolatey on your system.

Part 2: Install MySQL

Open an Administrative Command Prompt (repeat the process from Step 1 if necessary).

Install MySQL Using Chocolatey:

Type the following command:
```choco install mysql```
Press Enter. Chocolatey will manage the download and installation of MySQL along with its dependencies.

Part 3: Start MySQL Server

- Start the MySQL Service:
Type the following command in the Command Prompt:
```net start MySQL```
Troubleshooting Common Errors

Access Denied Error:

If you encounter the following error:
ERROR 1045 (28000): Access denied for user 'ODBC'@'localhost' (using password: NO)

Log in using:
```mysql -u username -p  # if your MySQL user has a password```
or
```mysql -u username```     # if your MySQL user does not have a password

MySQL Service Not Starting:

Error Message:

Windows could not start the MySQL service on Local Computer. Error 1067: The process terminated unexpectedly.


Check the MySQL Error Log:

Locate the my.ini file in your MySQL server directory (typically under C:\Program Files\MySQL\MySQL Server X.X).
Find the log-error entry to locate your error log file path.
Navigate to the directory containing the error log and open the file (often named something like hostname.err) in a text editor.

Verify MySQL Data Directory:

Open your MySQL configuration file (my.ini or my.cnf).
Ensure the datadir path exists and MySQL has write permissions for this directory.

Re-run Initialization After Clearing Data Directory:

Stop MySQL Server:

``` net stop MySQL ```
Clear the Data Directory:
Locate the data directory using the datadir setting in the MySQL configuration file.
Delete all files and folders within this directory.

Re-run Initialization:
```mysqld --initialize ```
``` net start MySQL ```

Case-insensitive table names

# Local MySQL database

We have migrated from PlanetScale to a local MySQL database at the moment. This section will be updated once we complete the data migration over to a new db provider.

# Environment variables
- Ask a team member for the .env variables

Setup:
1. Npm install
2. Npm run pr - creates a pr and attaches trello card description
- Use case: when the ticket id is in the branch name or specified as an argument to the command
3. Npm run genapispecs - generates the specs.json
4. Npm run resetDB - deletes the data from the db tables
5. Npm run dbtots - generates the schema and interface for each table in the db

# VSCode Setup

Packages/Extensions to install when working with VSCode ->

```typescript
Linter tool: Prettier
ESLint
Git History
Git Lens
{
    "editor.tabSize": 2,
    "editor.indentSize": "tabSize",
    "diffEditor.renderSideBySide": false,
    "editor.codeActionsOnSave": {
        "source.fixAll": "explicit",
        "source.fixAll.eslint": "explicit",
        "source.organizeImports": "explicit",
        "source.addMissingImports": "explicit"
    },
    "javascript.updateImportsOnFileMove.enabled": "always",
    "typescript.updateImportsOnFileMove.enabled": "always",
    "[json]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[typescript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    }
}
```

# Environments

1. Local
2. Staging
3. Prod

# Workflow Process

Contributing ->

In order to contribute changes, you can checkout a branch off of "development", make changes, and then open a PR. We'll often review PRs during our regular meetings.
We have a pull request template here to help inspire your PR descriptions: https://github.com/tifapp/FitnessProjectBackend/blob/main/.github/pull_request_template.md

For each change, please explain WHY you’re making it before explaining WHAT the change is. This helps ensure all changes are meaningful and valuable, and helps inspire better suggestions from reviewers. PR descriptions serve as a crucial reference point of documentation, so don't skimp on this part.

Ideally, each PR should have a trello ticket linked to it so the team can prioritize and track the change. You can link a ticket by putting the URL to the ticket at the bottom of the PR. If your PR does not cover an explicit ticket (eg. in the moment fix, or the ticket hasn't been created for some reason), you can put TASK_UNTRACKED at the bottom of the PR. However, only do this sparingly.

1. Ticket URL in pr description
2. Ticket ID in pr description
3. Ticket ID in branch name

# Adding a New SQL Route to the Backend API

Our backend API is designed with a structured layered architecture to streamline data handling and facilitate testing. This guide will explain the process of adding a new SQL route to our backend API.

## Step 1: Create or Use an Existing Data Type Folder

The main API is found in the `APILambda` folder. This folder contains different subfolders for each type of data (e.g., `users`, `events`). If you're introducing a new data type that does not yet have a corresponding folder, create a new one.

```plaintext
.
└── APILambda
    ├── users
    ├── events
    └── <new_data_type_folder>
```

## Statements

In order to operate on the database you'll need to write SQL statements.

Navigate to your specific data type folder, and locate the `<your_data_type>.ts` to add queries specific to that data type file or `SQL.ts` file for adding queries that will be used in multiple files.

```plaintext
APILambda
└── <your_data_type_folder> (e.g., users, products, etc.)
    ├── <your_data_type>.ts (This is where you add your SQL statements)
    ├── <your_data_type>.test.ts
    └── SQL.ts (This is where you add your SQL statements to be used in multiple files)
```

In this file, write your SQL statements for the new route. This SQL statement should return the desired query result for your route.

For example, if you're adding a new "products" route, you might add a SQL statement like the following in the `getNewProduct.ts` or `SQL.ts` file under the `products` folder:

```typescript
// getNewProduct.ts or SQL.ts in 'products' folder
import { MySQLExecutableDriver, conn, failure, success } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const getNewProduct = (
  conn: MySQLExecutableDriver,
  productId: string,
) => {
  return conn.queryResults(
    `SELECT * FROM products WHERE id = :productId`,
    { productId }
  )
}
```

## Transactions

Transactions ensure the integrity of the database by treating a set of SQL operations as a single unit. The transactions will use the SQL statements to perform atomic operations on the database and return a "success" or "error" result to the route.

Your transaction function will be placed in the `getNewProduct.ts` file within your specific data type folder. The transaction should return a "success" status and the query result upon successful execution. If there's an error during the transaction, it should return an "error" status and a descriptive error message.

```plaintext
APILambda
└── <your_data_type_folder> (e.g., users, products, etc.)
    ├── <your_data_type>.ts (This is where you add your transactions)
    ├── <your_data_type>.test.ts
    └── SQL.ts
```

For example, if you're working on the "products" route, and you have a SQL statement to retrieve a product by ID, your transaction in the `getNewProduct.ts` file might look like this:

```typescript
// getNewProduct.ts in 'products' folder
import { MySQLExecutableDriver, conn, failure, success } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

const getNewProductTransaction = (conn: MySQLExecutableDriver, id: string) =>
  conn.transaction((tx) =>
    getNewProduct(tx, id)
      .flatMapSuccess((result) => {
        return success(result)
      })
      .flatMapFailure((error) => {
        return failure(error)
      })
  );
```

This transaction uses the getNewProduct SQL statement to retrieve data from the database, and handles any potential errors to maintain the stability of the backend API.

## Routes

Routes determine the way your API responds to the client at specific URI endpoints. Routes are composed of transactions and will consume the "success" or "error" results from transactions and convert them into proper HTTP status codes for the client.

Each route is defined in a specific file within its corresponding data type folder. This allows for better code organization and maintainability.


To add a new route, follow these steps:

1. Navigate to the relevant data type folder, e.g., `user`, `product`, etc.

2. Create a new file for your route, `<your_data_type>.ts`, inside the data type folder.

3. Define your route in the newly created file, specifying the necessary logic and functionality. This route should return an HTTP status code signifying success and the query result for successful transactions. If the transaction results in an error, the route should return an "error" status code and an error message.

4. Update `app.ts` file to include reference to your newly created route from `<your_data_type>.ts` file.

5. Ensure `specs.json` file is updated upon committing.

```plaintext
APILambda
└── <your_data_type_folder> (e.g., users, products, etc.)
    ├── <your_data_type>.ts (This is where you define your route)
    ├── <your_data_type>.test.ts
    └── SQL.ts
```

For example, if you're adding a "products" route to get a product by its ID, your route in the `getNewProduct.ts` file might look like this:

```typescript
// getNewProduct.ts in 'products' folder
import { MySQLExecutableDriver, conn, failure, success } from "TiFBackendUtils"
import { ServerEnvironment } from "../env.js"
import { ValidatedRouter } from "../validation.js"

export const getNewProductRouter = (
  environment: ServerEnvironment,
  router: ValidatedRouter
) => {
  /**
   * get new product by id
   */
  router.getWithValidation("/new-product/:id", {}, (req, res) =>
    getNewProductTransaction(conn, req.params.id)
      .mapSuccess((result) => res.status(200).json(result))
      .mapFailure((error) => res.status(404).json({ error }))
  )
```

This route listens to GET requests at the /new-product/:id endpoint, calls the getNewProductTransaction function, and returns the appropriate HTTP status code and data based on the transaction's result.

## Tests

Tests are critical to ensure the integrity and stability of your SQL route. Tests should be written for every new route or modification to an existing route. Tests are located in the same directory where you create your route in the data type directory. Your tests should cover both successful transactions and potential error conditions.

The directory structure for your tests would be:

```plaintext
APILambda
└── <your_data_type_folder> (e.g., users, products, etc.)
    ├── <your_data_type>.ts 
    ├── <your_data_type>.test.ts (This is where you write your tests)
    └── SQL.ts

```

For example, if you're testing the "products" route you've added, the tests could be written in a file named `getNewProduct.test.ts` in the "products" folder. The file might contain tests similar to the following:

```typescript
// getNewProduct.test.ts in 'products' folder
import request from "supertest"
import app from "<path_to_your_express_app>"

describe("GET /new-product/:id", () => {
  it("returns data for a valid id", async () => {
    const id = 1 // assuming 1 is a valid ID
    const res = await request(app).get(`/new-product/${id}`)

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveProperty("id")
    expect(res.body.id).toEqual(id)
    // ...other expectations...
  })

  it("returns an error for an invalid id", async () => {
    const id = 9999 // assuming 9999 is an invalid ID
    const res = await request(app).get(`/new-product/${id}`)

    expect(res.statusCode).toEqual(500)
    // ...other expectations...
  })
})
```

These tests make HTTP requests to the new "products" route and assert that the response is as expected. The first test is for a successful transaction with a valid ID, while the second test is for an error scenario where an invalid ID is provided.

#### Staging Tests

Currently npm run test:staging-unix only works on unix devices.
For windows, copy the associated command and replace COGNITO_USER and COGNITO_PASSWORD with your desired login info.
