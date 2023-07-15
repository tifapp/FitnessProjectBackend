Todo: Add aws section
Todo: Add section for testing locally

# FitnessProject

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

## Step 2: Write SQL Statements

In order to operate on the database you'll need to write SQL statements.

Navigate to your specific data type folder, and locate the `SQLStatements.ts` file. 

```plaintext
APILambda
└── <your_data_type_folder> (e.g., users, products, etc.)
    ├── routes.ts
    ├── transactions.ts
    └── SQLStatements.ts (This is where you add your SQL statements)
```

In this file, write your SQL statements for the new route. This SQL statement should return the desired query result for your route.

For example, if you're adding a new "products" route, you might add a SQL statement like the following in the `SQLStatements.ts` file under the `products` folder:

```typescript
// SQLStatements.ts in 'products' folder
export const getNewProduct = `SELECT * FROM products WHERE id = $1`;
```

## Step 3: Create a Transaction

Transactions ensure the integrity of the database by treating a set of SQL operations as a single unit. The transactions will use the SQL statements to perform atomic operationss on the database and return a "success" or "error" result to the route.

Your transaction function will be placed in the `transactions.ts` file within your specific data type folder. The transaction should return a "success" status and the query result upon successful execution. If there's an error during the transaction, it should return an "error" status and a descriptive error message.

```plaintext
APILambda
└── <your_data_type_folder> (e.g., users, products, etc.)
    ├── routes.ts
    ├── transactions.ts (This is where you add your transactions)
    └── SQLStatements.ts
```

For example, if you're working on the "products" route, and you have a SQL statement to retrieve a product by ID, your transaction in the transactions.ts file might look like this:

```typescript
// transactions.ts in 'products' folder
import { getNewProduct } from './SQLStatements.ts';
import { db } from '<path_to_db_connection>';

export async function getNewProductTransaction(id) {
  try {
    const result = await db.query(getNewProduct, [id]);
    return { status: "success", data: result.rows[0] };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}
```

This transaction uses the getNewProduct SQL statement to retrieve data from the database, and handles any potential errors to maintain the stability of the backend API.

## Step 4: Define a New Route

Routes determine the way your API responds to the client at specific URI endpoints. Routes are composed of transactions and will consume the "success" or "error" results from transactions and convert them into proper HTTP status codes for the client.

This new route will be defined in the `routes.ts` file inside your data type folder. This route should return an HTTP status code signifying success and the query result for successful transactions. If the transaction results in an error, the route should return an "error" status code and an error message.

```plaintext
APILambda
└── <your_data_type_folder> (e.g., users, products, etc.)
    ├── routes.ts (This is where you define your route)
    ├── transactions.ts
    └── SQLStatements.ts
```

For example, if you're adding a "products" route to get a product by its ID, your route in the routes.ts file might look like this:

```typescript
// routes.ts in 'products' folder
import express from 'express';
import { getNewProductTransaction } from './transactions.ts';

const router = express.Router();

router.get("/new-product/:id", async (req, res) => {
  const { id } = req.params;
  const result = await getNewProductTransaction(id);
  
  if (result.status === "success") {
    return res.status(200).json(result.data);
  } else {
    return res.status(500).json({ error: result.message });
  }
});

export default router;
```

This route listens to GET requests at the /new-product/:id endpoint, calls the getNewProductTransaction function, and returns the appropriate HTTP status code and data based on the transaction's result.

## Step 5: Write Tests

Tests are cruitcal to ensure the integrity and stability of your SQL route. Tests should be written for every new route or modification to an existing route. Tests are located in the 'tests' folder at the root of the project. Your tests should cover both successful transactions and potential error conditions.

The directory structure for your tests would be:

```plaintext
APILambda
├── <your_data_type_folder> (e.g., users, products, etc.)
└── tests
    └── <your_data_type>.test.ts (This is where you write your tests)
```

For example, if you're testing the "products" route you've added, the tests could be written in a file named products.test.ts in the 'tests' folder. The file might contain tests similar to the following:

```typescript
// products.test.ts in 'tests' folder
import request from 'supertest';
import app from '<path_to_your_express_app>';

describe("GET /new-product/:id", () => {
  it("returns data for a valid id", async () => {
    const id = 1; // assuming 1 is a valid ID
    const res = await request(app).get(`/new-product/${id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body.id).toEqual(id);
    // ...other expectations...
  });

  it("returns an error for an invalid id", async () => {
    const id = 9999; // assuming 9999 is an invalid ID
    const res = await request(app).get(`/new-product/${id}`);

    expect(res.statusCode).toEqual(500);
    // ...other expectations...
  });
});
```

These tests make HTTP requests to the new "products" route and assert that the response is as expected. The first test is for a successful transaction with a valid ID, while the second test is for an error scenario where an invalid ID is provided.
