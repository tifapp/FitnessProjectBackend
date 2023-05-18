import dotenv from "dotenv";
import express from "express";

import { createUser, getAllUsers, getUserById, updateUser } from "./sqlhandler.js";

import { createEvent, getEventById, updateEvent } from "./sqlhandler.js";

import { addAttendieToEvent, getEventAttendies, getEventForUser, removeFromEvent } from "./sqlhandler.js";

import { getCurrentInvoke } from '@vendia/serverless-express';

dotenv.config();
const app = express();
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Todo: Add types
// @ts-ignore
const addUserIdToRequest = (req, res, next) => {
  const {event} = getCurrentInvoke()

  if (event?.headers?.Authorization != null) {
    const token = event.headers.Authorization.split(' ')[1];

    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    req.userId = claims!.sub;
  }

  next();
};

// Usage
app.use(addUserIdToRequest);

if (process.env.DEV) {
  app.listen(8080, () => {
    console.log(`Example app listening on port ${8080}`);
  });
}

router.get("/", (req, res) => {
  res.send("Hello, world!");
});

//User
router.get("/lambdaSQLRoute/user", async (req, res) => {
  const result = await getAllUsers(req);
  console.log(req.body);
  res.json(result);
});

router.post("/lambdaSQLRoute/user", async (req, res) => {
  const result = await createUser(req);
  console.log(req.body);
  res.json(result);
});

router.get("/lambdaSQLRoute/user/:userId", async (req, res) => {
  console.log(req.params);
  const result = await getUserById(req);
  res.json(result);
});

router.put("/lambdaSQLRoute/user/:userId", async (req, res) => {
  const result = await updateUser(req);
  console.log(req.body);
  res.json(result);
});

// Event
// router.get("/lambdaSQLRoute/event", async (req, res) => {
//   const result = await getAllEvents(req);
//   console.log(req.body);
//   res.json(result);
// });

router.get("/lambdaSQLRoute/event/:eventId", async (req, res) => {
  const result = await getEventById(req);
  console.log(req.body);
  res.json(result);
});

router.put("/lambdaSQLRoute/event/:eventId", async (req, res) => {
  const result = await updateEvent(req);
  console.log(req.body);
  res.json(result);
});

router.post("/lambdaSQLRoute/event", async (req, res) => {
  const result = await createEvent(req);
  console.log(req.body);
  res.json(result);
});

// eventAttendance
router.get("/lambdaSQLRoute/eventAttendance", async (req, res) => {
  const result = await getEventAttendies(req);
  console.log(req.body);
  res.json(result);
});

router.post("/lambdaSQLRoute/eventAttendance", async (req, res) => {
  const result = await addAttendieToEvent(req);
  console.log(req.body);
  res.json(result);
});

router.delete("/lambdaSQLRoute/eventAttendance/:userId", async (req, res) => {
  const result = await removeFromEvent(req);
  console.log(req.body);
  res.json(result);
});
router.get("/lambdaSQLRoute/eventAttendance/:userId", async (req, res) => {
  const result = await getEventForUser(req);
  console.log(req.body);
  res.json(result);
});

app.use("/", router);
export default app;
