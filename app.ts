import { getCurrentInvoke } from "@vendia/serverless-express";
import dotenv from "dotenv";
import express from "express";
import {
  addFriend,
  addSelfToEvent,
  createEvent,
  createUser,
  getAllUsers,
  getEventAttendies,
  getEventById,
  getEvents,
  getUserById,
  leaveEvent,
  removeFriend,
  removeFromEvent,
  updateEvent,
  updateUser,
} from "./sqlhandler.js";

import { User, UserList } from "./sqlhandler.js";

dotenv.config();
const app = express();
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Todo: Add types
// @ts-ignore
const addUserIdToRequest = (req, res, next) => {
  const { event } = getCurrentInvoke();

  if (event?.headers?.Authorization != null) {
    const token = event.headers.Authorization.split(" ")[1];

    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );

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

/** 
██╗   ██╗███████╗███████╗██████╗ 
██║   ██║██╔════╝██╔════╝██╔══██╗
██║   ██║███████╗█████╗  ██████╔╝
██║   ██║╚════██║██╔══╝  ██╔══██╗
╚██████╔╝███████║███████╗██║  ██║
 ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
*/

// - GET = Gets the profile info for a list of ids passed in the query parameter
router.get("/user", async (req, res) => {
  const Listofusers: UserList = {
    userIdList: [],
  };
  const result = await getAllUsers(Listofusers);
  console.log(req.body);
  res.json(result);
});
// - POST = Create an account
router.post("/user", async (req, res) => {
  const result = await createUser(req);
  console.log(req.body);
  res.json(result);
});
// - GET = Get a single user
router.get("/user/:userId", async (req, res) => {
  const Id: User = {
    userId: req.params.userId,
  };
  const result = await getUserById(Id);
  res.json(result);
});
//- GET = Get your account info
router.get("/user/self", async (req, res) => {
  //const result = await updateUser(req);
  console.log(req.body);
  //res.json(result);
});
// - DELETE = Delete your account
router.delete("/user/self", async (req, res) => {
  //const result = await updateUser(req);
  console.log(req.body);
  //res.json(result);
});
//- PATCH = Update your account settings
router.patch("/user/self", async (req, res) => {
  const result = await updateUser(req);
  console.log(req.body);
  res.json(result);
});

/** 
███████╗██╗   ██╗███████╗███╗   ██╗████████╗
██╔════╝██║   ██║██╔════╝████╗  ██║╚══██╔══╝
█████╗  ██║   ██║█████╗  ██╔██╗ ██║   ██║   
██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║   ██║   
███████╗ ╚████╔╝ ███████╗██║ ╚████║   ██║   
╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   
*/
// - GET = Events by region
router.get("/event", async (req, res) => {
  const result = await getEvents(req);
  console.log(req.body);
  res.json(result);
});
// - POST = Create event
router.post("/event", async (req, res) => {
  const result = await createEvent(req);
  console.log(req.body);
  res.json(result);
});
//- GET = Get single event
router.get("/event/:eventId", async (req, res) => {
  const result = await getEventById(req);
  console.log(req.body);
  res.json(result);
});
// - PATCH = Update single event
router.patch("/event/:eventId", async (req, res) => {
  const result = await updateEvent(req);
  console.log(req.body);
  res.json(result);
});
//- DELETE = Delete single event
router.delete("/event/:eventId", async (req, res) => {
  //const result = await createEvent(req);
  console.log(req.body);
  //res.json(result);
});

/** 
███████╗██╗   ██╗███████╗███╗   ██╗████████╗ █████╗ ████████╗████████╗███████╗███╗   ██╗██████╗  █████╗ ███╗   ██╗ ██████╗███████╗
██╔════╝██║   ██║██╔════╝████╗  ██║╚══██╔══╝██╔══██╗╚══██╔══╝╚══██╔══╝██╔════╝████╗  ██║██╔══██╗██╔══██╗████╗  ██║██╔════╝██╔════╝
█████╗  ██║   ██║█████╗  ██╔██╗ ██║   ██║   ███████║   ██║      ██║   █████╗  ██╔██╗ ██║██║  ██║███████║██╔██╗ ██║██║     █████╗  
██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║   ██║   ██╔══██║   ██║      ██║   ██╔══╝  ██║╚██╗██║██║  ██║██╔══██║██║╚██╗██║██║     ██╔══╝  
███████╗ ╚████╔╝ ███████╗██║ ╚████║   ██║   ██║  ██║   ██║      ██║   ███████╗██║ ╚████║██████╔╝██║  ██║██║ ╚████║╚██████╗███████╗
╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
                                                                                                                                  
*/
//- GET = Get paginated list of all event attendees
router.get("/event/:eventId/attendee", async (req, res) => {
  const result = await getEventAttendies(req);
  console.log(req.body);
  res.json(result);
});
//- POST = Join an event
router.post("/event/:eventId/attendee/self", async (req, res) => {
  const result = await addSelfToEvent(req);
  console.log(req.body);
  res.json(result);
});
// - DELETE = Leave the event
router.delete("/event/:eventId/attendee/self", async (req, res) => {
  const result = await leaveEvent(req);
  console.log(req.body);
  res.json(result);
});
//- DELETE = Kick a user from an event
router.delete("/event/:eventId/attendee/:userId", async (req, res) => {
  const result = await removeFromEvent(req);
  console.log(req.body);
  res.json(result);
});
// - PUT = Tell the host if the user is at the event
router.get("/event/:eventId/attendee/self/status", async (req, res) => {
  //
  console.log(req.body);
  //res.json(result);
});

/** 
███████╗██████╗ ██╗███████╗███╗   ██╗██████╗ 
██╔════╝██╔══██╗██║██╔════╝████╗  ██║██╔══██╗
█████╗  ██████╔╝██║█████╗  ██╔██╗ ██║██║  ██║
██╔══╝  ██╔══██╗██║██╔══╝  ██║╚██╗██║██║  ██║
██║     ██║  ██║██║███████╗██║ ╚████║██████╔╝
╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═══╝╚═════╝ 
*/
//- POST = Add the user as a friend
router.post("/user/friend/:userId", async (req, res) => {
  const result = await addFriend(req);
  console.log(req.body);
  res.json(result);
});

router.delete("/user/friend/:userId", async (req, res) => {
  const result = await removeFriend(req);
  console.log(req.body);
  res.json(result);
});

app.use("/", router);
export default app;
