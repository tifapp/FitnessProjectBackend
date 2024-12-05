## [View Database Schema](schema.md)

## Table of Contents

- [Introduction](#introduction)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
  - [Geocoding Lambda](#geocoding-lambda)
  - [API Lambda](#api-lambda)
- [Adding a New Endpoint](#adding-a-new-endpoint)
  - [Rules for Creating an Endpoint](#rules-for-creating-an-endpoint)
  - [Step 1: Create or Use a Data Type Folder](#step-1-create-or-use-a-data-type-folder)
  - [Step 2: Write SQL Statements](#step-2-write-sql-statements)
  - [Step 3: Create Transactions](#step-3-create-transactions)
  - [Step 4: Define the Route](#step-4-define-the-route)
  - [Step 5: Write Tests](#step-5-write-tests)
  - [Step 6: Update the Application](#step-6-update-the-application)
- [Database Setup](#database-setup)
  - [MySQL Setup for macOS](#mysql-setup-for-macos)
  - [MySQL Setup for Windows](#mysql-setup-for-windows)
  - [Common Errors](#common-errors)
- [Running the Project](#running-the-project)
- [Testing](#testing)
  - [Running Tests](#running-tests)
  - [Debugging Tips](#debugging-tips)
- [AWS Setup](#aws-setup)
  - [Services Utilized](#services-utilized)
  - [System Diagrams](#system-diagrams)
  - [CI/CD](#ci-cd)
- [VSCode Setup](#vscode-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Troubleshooting](#troubleshooting)
- [Useful Commands](#useful-commands)
- [Additional Resources](#additional-resources)

---

## Introduction

The FitnessProject Backend is a Node.js application that provides a RESTful API for our fitness platform. It handles user authentication, event management, geocoding, and other core functionalities. The backend is built using Express.js and connects to a MySQL database, leveraging AWS services such as Lambda and API Gateway.

This guide will walk you through setting up the project on your local machine, understanding the codebase, and contributing to the development by adding new endpoints.

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v14.x or later)
- **npm** (v6.x or later)
- **MySQL** (v5.7 or later)
- **AWS CLI** (optional, for AWS interactions)

### Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/FitnessProjectBackend.git
   cd FitnessProjectBackend
   ```
  
2. **Install TiFShared**

TiFShared is a required dependency of all subprojects and requires a symlink to test properly.
Please see installation instructions [here](https://github.com/tifapp/TiFShared?tab=readme-ov-file#local-development-setup) and ensure the package is properly linked before continuing.

3. **Install Dependencies**

Performing an `npm install` from the root folder installs dependencies for all subprojects.

   ```bash
   npm install
   ```

4. **Set Up the Database**

Follow the [Database Setup](#database-setup) instructions for your operating system.

5. **Configure Environment Variables**

   - Create a `.env` file in the root directory.
   - Ask a team member for the necessary environment variables.
   - Add the variables to the `.env` file.

6. **Test**

   - Perform an `npm test` from the root folder before development, to ensure everything works as expected.

---

## Project Structure

The project is organized into several directories:

```plaintext
FitnessProjectBackend/
├── APILambda/
│   ├── events/
│   ├── user/
├── GeocodingLambda/
├── TiFBackendUtils/
├── package.json
└── ...
```

- **APILambda**: Contains the main API server, organized by resource (e.g., `user`, `events`).
- **GeocodingLambda**: AWS Lambda function for geocoding services.
- **TiFBackendUtils**: Shared utilities.

### Geocoding Lambda

![Geocoding Lambda Diagram](https://github.com/tifapp/FitnessProjectBackend/assets/70039847/2366e521-0e75-4e13-ae56-8953c2d30840)

- **Purpose**: The Geocoding Lambda function transforms location coordinates into human-readable addresses, or vice versa, and stores them in the database.

### API Lambda

![API Lambda Diagram](https://github.com/tifapp/FitnessProjectBackend/assets/70039847/8ce31b28-3c75-466d-9fe5-ea274d118336)

- **Purpose**: The API Lambda is directly accessible by the end-user and is used to access data or perform operations required by the app, such as reading and modifying user data and event data.

---

## Adding a New Endpoint

To add a new endpoint to the backend API, follow these steps:

### Step 1: Add Definition to API Schema

The first step is to add a definition for the new endpoint to the API schema. Follow the instructions in the [TiFShared README](https://github.com/tifapp/TiFShared/blob/main/README.md#api) to define the endpoint, keeping in mind the required inputs and outputs.

**Tips**:

- **Consult the Frontend Team**: Ensure the data structure aligns with frontend requirements.
- **Define Request and Response Types**: Thoughtfully consider the schemas for input and output types. See recommended practices [1](https://restfulapi.net/resource-naming/) [2] (https://swagger.io/resources/articles/best-practices-in-api-design/)

### Step 2: Implement the Endpoint

After defining the endpoint in the API schema, you can start implementing it.

- **Create a New File**: Place your endpoint code in the appropriate data type folder (e.g., `user`, `events`).
- **Use `endpoint()` or `authenticatedEndpoint()`**: These functions help validate input and output types.

**Example**:

```typescript
// user/createUser.ts
import { endpoint } from "TiFBackendUtils";
import { conn } from "../db";
import { generateUniqueHandle, checkValidName } from "./utils";
import { DBuser } from "../types";
import { uuidV7 } from "uuidv7";
import jwt from "jsonwebtoken";
import { envVars } from "../env";
import { resp } from "../utils";

export const createCurrentUserProfile = endpoint<"createCurrentUserProfile">(
  async ({ body: { name } }) =>
    checkValidName(name)
      .flatMapSuccess(() => generateUniqueHandle(name))
      .flatMapSuccess((handle) => insertUser(conn, { handle, name }))
      .mapFailure((error) =>
        error === "invalid-name"
          ? (resp(400, { error }) as never)
          : (resp(500, { error }) as never)
      )
      .mapSuccess((result) =>
        resp(201, {
          ...result,
          token: jwt.sign(
            { ...result, handle: result.handle.rawValue },
            envVars.JWT_SECRET
          )
        })
      )
      .unwrap()
);

const insertUser = (
  conn: MySQLExecutableDriver,
  userDetails: Pick<DBuser, "handle" | "name">
) => {
  const id = uuidV7();
  return conn
    .executeResult(
      "INSERT INTO user (id, name, handle) VALUES (:id, :name, :handle)",
      { id, ...userDetails }
    )
    .withSuccess({ id, ...userDetails });
};
```

**Notes**:

- **Use `endpoint()`**: For endpoints that don't require authentication.
- **Use `authenticatedEndpoint()`**: For endpoints that require authentication.
  - **Type Validation**: These functions ensure your input and output types match the API schema.
- **Error Handling**: Use `resp(statusCode, responseBody)` to construct HTTP responses.
- **`never` Type**: Applied to return values that shouldn't typically occur, aiding in type safety.

### Step 3: Add Endpoint to Router

After implementing your endpoint, add it to the `TiFRouter` in `appMiddleware.ts`.

**Example**:

```typescript
// appMiddleware.ts
import { TiFRouter } from "TiFBackendUtils";
import { createCurrentUserProfile } from "./user/createUser";

export const addTiFRouter = (app: Express, env: ServerEnvironment) => {
  app.use(
    "/",
    TiFRouter(
      {
        // ... other endpoints ...
        createCurrentUserProfile,
        // ... other endpoints ...
      },
      env
    )
  );
  return app;
};
```

If common functionality is found between endpoints, you can extract it to a separate API middleware function like so:

```typescript
export const isCurrentUser: APIMiddleware<RouterParams> = async (
  input,
  next
) => {
  if (!input.params!.userId || input.context.selfId === input.params!.userId) {
    return resp(400, { error: "current-user" }) as never
  } else {
    return next(input)
  }
}
```

And apply that to the current endpoint you're developing like so:

```typescript
export const blockUser = authenticatedEndpoint<"blockUser">(
  ({ context: { selfId: fromUserId }, params: { userId: toUserId } }) =>
    conn
      .transaction((tx) => blockUserSQL(tx, { fromUserId, toUserId }))
      .mapSuccess(() => resp(204))
      .mapFailure(() => resp(404, userNotFoundBody(toUserId)))
      .unwrap(),
  isCurrentUser //Middleware is applied here
)
```

This applies the middleware function before the endpoint function executes.

### Step 4: Write Tests

Write tests for your endpoint using Jest and the `testAPI` helper functions.

**Example**:

```typescript
// user/createUser.test.ts
import { testAPI } from "../test/helpers";
import { createUserFlow } from "../test/flows";

describe("Create User Tests", () => {
  it("should create a new user", async () => {
    const name = "John Doe";
    const response = await testAPI.createCurrentUserProfile({ name });
    expect(response).toMatchObject({
      status: 201,
      data: expect.objectContaining({
        id: expect.any(String),
        name: "John Doe",
        handle: expect.any(String),
        token: expect.any(String),
      }),
    });
  });

  it("should return error for invalid name", async () => {
    const name = ""; // Invalid name
    const response = await testAPI.createCurrentUserProfile<400>({ name });
    expect(response).toMatchObject({
      status: 400,
      data: { error: "invalid-name" },
    });
  });
});
```

**Notes**:

- **Use `testAPI` Helper**: Simplifies making API calls in tests. Pass a status code type param to assume a specific status code response for a given test.
- **Cover Different Scenarios**: Test both successful cases and error conditions.
- **Test Location**: Place tests in the same directory as the endpoint file.

### Step 5: Test the Endpoint Locally

You can test the endpoint directly via localhost.

- **Start the Server**:

  ```bash
  npm run start
  ```

- **Use API Clients**: Tools like `curl`, `Postman`, or `Insomnia` can be used.

**Example**:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe"}' \
  http://localhost:3000/user
```

---

## Database Setup

### MySQL Setup for macOS

**Part 1: Install Homebrew**

1. **Install Homebrew**

   Open Terminal and run:

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

**Part 2: Install MySQL**

1. **Update Homebrew**

   ```bash
   brew update
   ```

2. **Install MySQL**

   ```bash
   brew install mysql
   ```

**Part 3: Secure the Installation**

1. **Run the Security Script**

   ```bash
   mysql_secure_installation
   ```

   - Set a root password
   - Remove anonymous users
   - Disallow root login remotely
   - Remove test databases
   - Reload privilege tables

**Part 4: Start the MySQL Server**

1. **Start MySQL**

   ```bash
   brew services start mysql
   ```

2. **Connect to MySQL**

   ```bash
   mysql -u root -p
   ```

### MySQL Setup for Windows

**Note**: These instructions use Chocolatey to install MySQL. We recommended Chocolatey on Windows as it automatically handles installation of MySQL dependencies.

**Part 1: Install Chocolatey**

1. **Open an Administrative Command Prompt**

   - Press `Win + R`, type `cmd`, and press `Ctrl + Shift + Enter`.

2. **Install Chocolatey**

   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; `
     [System.Net.ServicePointManager]::SecurityProtocol = `
     [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; `
     iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
   ```

**Part 2: Install MySQL**

1. **Install MySQL**

   ```bash
   choco install mysql
   ```

**Part 3: Start MySQL Server**

1. **Start MySQL Service**

   ```bash
   net start MySQL
   ```

2. **Connect to MySQL**

   ```bash
   mysql -u root -p
   ```

### Common Errors

**Access Denied Error**

If you encounter:

```
ERROR 1045 (28000): Access denied for user 'ODBC'@'localhost' (using password: NO)
```

Log in using:

```bash
mysql -u your_username -p
```

**MySQL Service Not Starting**

Error Message:

```
Windows could not start the MySQL service on Local Computer. Error 1067: The process terminated unexpectedly.
```

**Troubleshooting Steps**:

1. **Check the MySQL Error Log**

   - Locate the `my.ini` file (usually in `C:\Program Files\MySQL\MySQL Server X.X`).
   - Find the `log-error` entry to locate the error log file.
   - Open the error log file to identify issues.

2. **Verify MySQL Data Directory**

   - Ensure the `datadir` path in `my.ini` exists and has proper permissions.

3. **Re-initialize MySQL**

   - Stop MySQL Server:

     ```bash
     net stop MySQL
     ```

   - Clear the Data Directory:

     - Delete all files and folders within the `datadir` directory.

   - Re-run Initialization:

     ```bash
     mysqld --initialize
     net start MySQL
     ```

---

## Running the Project

To start the server locally:

```bash
npm run start
```

The server will run on the port specified in your `.env` file.

---

## Testing

### Running Tests

To execute all tests:

```bash
npm test
```

### Debugging Tips

- **TypeScript Errors**

  - Ensure `TiFShared` is properly linked to avoid type mismatches.
  - Temporarily remove the `endpoint()` wrapper function to debug complex type errors.
  - Ensure your IDE is pointing to the correct `TiFShared` directory.
  - Use `any` types temporarily to isolate type errors during debugging.

- **Unhandled Promises**

  - Always `await` asynchronous operations to prevent open handles.

---

## AWS Setup

Our backend uses AWS services, including Lambda functions and a MySQL database.

### Services Utilized

- **AWS Lambda**
- **AWS API Gateway**

### System Diagrams

Refer to the system diagrams for an overview of our architecture:

- **System Diagram**: [System Diagram - Google Drawings](https://docs.google.com/drawings/d/1zmWL7nTBsMtI-OAbfV9H0BQAGnlKgQ2S1o2ls-6jS6g)
- **Database Integration**: [Database Integration](https://docs.google.com/drawings/d/1NNd8BWqINceuRJAokFN_STy1oqjJm84EJvGI5QLQhaQ)

### CI/CD

We utilize Continuous Integration and Continuous Deployment (CI/CD) practices to streamline development.

- **Continuous Integration (CI)**:

  - **Build Process**: Tools like GitHub Actions package our Lambda code with dependencies.
  - **Unit Tests**: Automated tests run to ensure new changes don't break existing functionality.

- **Continuous Deployment (CD)**:

  - After successful tests, code is automatically deployed to AWS Lambda.
  - **Deployment Tools**: We use GitHub Actions for automating deployments from our repositories.

CI and CD must pass before a pull request can be merged into `development`.

### AWS Credentials

- Obtain AWS access keys from a team member if configuring or testing AWS services.
- Configure your AWS CLI with these credentials.

**Note**: Ensure new Lambda aliases have the correct permissions. New Lambda aliases start without any policy statements.

---

## VSCode Setup

For consistency, use Visual Studio Code with the following extensions:

- **Prettier - Code Formatter**
- **ESLint**
- **GitLens**
- **Git History**

Add the following to your VSCode `settings.json`:

```json
{
  "editor.tabSize": 2,
  "editor.indentSize": "tabSize",
  "diffEditor.renderSideBySide": false,
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.fixAll.eslint": true,
    "source.organizeImports": true,
    "source.addMissingImports": true
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

- **Prettier**: Automatically formats your code to ensure consistent style.

---

## Contributing Guidelines

We follow a structured process for contributions:

1. **Branching**

   - Create a new branch from `development`.
   - Include the ticket ID in the branch name if applicable.

2. **Making Changes**

   - Follow coding standards and conventions.
   - Write clear commit messages.

3. **Pull Requests**

   - Open a PR against the `development` branch.
   - Use the provided PR template: [Pull Request Template](https://github.com/tifapp/FitnessProjectBackend/blob/main/.github/pull_request_template.md)
   - Include the Trello ticket URL or ID in the description.
   - Explain **why** before **what** in your PR description.
   - If the PR doesn't cover an explicit ticket, include `TASK_UNTRACKED` in the description (use sparingly).

4. **Code Reviews**

   - PRs are reviewed during team meetings.
   - Be prepared to discuss and adjust your code.

---

## Troubleshooting

If you encounter issues, please reach out on Slack. For configuration issues, contribute to the [WTF Issues Document](https://github.com/tifapp/TiFShared/wiki/WTF-Issues) with details and steps taken to resolve the problem.

- **TypeScript and SQL Mismatches**

  - Ensure your TypeScript types align with your SQL queries.
  - Be cautious as SQL does not always match TypeScript types.

- **Linking Issues**

  - Confirm that `TiFShared` is correctly linked to prevent type errors.

- **Open Handles Warnings**

  - Close all database connections in tests.
  - Await all promises in your code.

**Common Errors**:

- **Access Denied Error**: Ensure you're using the correct username and password when logging into MySQL.
- **MySQL Service Not Starting**: Check the error logs, verify the data directory, and re-initialize if necessary.

---

## Useful Commands

- **Install Dependencies**

  ```bash
  npm install
  ```

- **Run the Server**

  ```bash
  npm run start
  ```

- **Run Tests**

  ```bash
  npm test
  ```

- **Create a Pull Request**

  ```bash
  npm run pr
  ```

  > Creates a PR and attaches the Trello card description (requires ticket ID in branch name or as an argument).

- **Reset the Database**

  ```bash
  npm run resetDB
  ```

---

## Additional Resources

- **Frontend Repository**

  - [FitnessProject Frontend](https://github.com/tifapp/FitnessProject/tree/development)

- **GitHub Wiki**

  - [TiFShared Wiki](https://github.com/tifapp/TiFShared/wiki)

- **Frontend Architecture**

  - [Frontend Architecture Documentation](https://github.com/tifapp/TiFShared/wiki/Frontend-Architecture)

---

## Key Concepts

- **Monad Functions**

  - `flatMapSuccess` / `flatMapFailure`: Transform results and possibly change success/failure state.
  - `mapSuccess` / `mapFailure`: Transform the value but keep the same state.
  - `withSuccess` / `withFailure`: Replace the value while keeping the state.

- **Testing Tips**

  - Assert on the whole response when possible.
  - Use temporary `any` types to isolate type errors during debugging.

---

## API Testing from the Command Line

You can test API endpoints using `curl` from the command line. Our API supports different stages:

- **stagingTest**: In sync with the most recent pull request (unstable).
- **staging**: In sync with the `development` branch.
- **prod**: In sync with the `main` branch.

Replace `[STAGE]` in the API endpoint with one of these stages depending on which environment you want to test.

### Obtaining an ID Token

We are no longer using Cognito for authentication tokens. Instead, you can obtain an ID token by creating a user profile via the API.

**Example**:

```bash
# Create User Profile and Obtain ID Token
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe"}' \
  https://[API_ENDPOINT]/[STAGE]/user
```

The response will include an `id` and a `token`. The `token` is your ID token to be used in subsequent API requests.

### Making an API Request

Once you have the ID token, you can make authenticated requests to the API.

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  https://[API_ENDPOINT]/[STAGE]/[PATH]
```

**Example**:

```bash
# Assume YOUR_ID_TOKEN is the token received from the previous step
curl -X GET \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  https://[API_ENDPOINT]/prod/user/self
```

**Note**:

- Replace `[STAGE]` with `stagingTest`, `staging`, or `prod` depending on the environment.
- Replace `[PATH]` with the specific API endpoint path you wish to access.
- Ensure that the `Authorization` header is set correctly with the token received.

**Important**: New Lambda aliases start without any policy statements. Ensure they have the necessary permissions to be accessed.

---
