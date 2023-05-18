import express from "express";
import dotenv from "dotenv";

import { getAllUsers } from "./sqlhandler.js";
import { getUserById } from "./sqlhandler.js";
import { createUser } from "./sqlhandler.js";
import { updateUser } from "./sqlhandler.js";

import { getAllEvents } from "./sqlhandler.js";
import { getEventById } from "./sqlhandler.js";
import { updateEvent } from "./sqlhandler.js";
import { createEvent } from "./sqlhandler.js";

import { getEventAttendies } from "./sqlhandler.js";
import { addAttendieToEvent } from "./sqlhandler.js";
import { removeFromEvent } from "./sqlhandler.js";
import { getEventForUser } from "./sqlhandler.js";

dotenv.config();
const app = express();
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
router.get("/lambdaSQLRoute/event", async (req, res) => {
  const result = await getAllEvents(req);
  console.log(req.body);
  res.json(result);
});

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
