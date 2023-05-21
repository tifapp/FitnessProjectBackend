// Todo: Add types
// @ts-nocheck
import { connect } from "@planetscale/database";
import fetch from "node-fetch";

const config = {
  fetch,
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

const conn = connect(config);

export type User = {
  userId: string;
};

export type UserList = {
  userIdList: string[];
};

// will need to change (currently waiting for responce from mathew for specifics on what he expects)
export const getAllUsers = async (req: UserList) => {
  let SQL = "SELECT * FROM User";
  //const results = await conn.execute(event.sql);
  const results = await conn.execute(SQL);
  //console.log(JSON.stringify(results,null,4));
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const getUserById = async (req: User) => {
  let SQL = "SELECT * FROM User WHERE userId = ?";
  const sqlparams = [];
  console.log(req.userId);
  sqlparams.push(req.userId);
  console.log(sqlparams);
  const results = await conn.execute(SQL, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const updateUser = async (req: any) => {
  let UPDATE = "UPDATE User ";
  let SET = "SET ";
  let sqlparams = [];
  //console.log(req.params.userId);
  let parse = JSON.parse(req.body);
  //console.log("parse :" + parse);
  let length = Object.keys(parse).length;
  console.log("length :" + length);
  for (var key in parse) {
    if (length > 1) {
      SET = SET + key + " = ?,";
      sqlparams.push(parse[key]);
    } else {
      SET = SET + key + " = ? ";
      sqlparams.push(parse[key]);
    }
    length = length - 1;
    //console.log(key)
    //console.log(parse[key])
  }

  UPDATE = UPDATE + SET + " WHERE userId = ?";
  sqlparams.push(req.params.userId);
  const results = await conn.execute(UPDATE, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const createUser = async (req: any) => {
  let INSERT = "INSERT INTO User (userId, ";
  let VALUES = "VALUES (";
  let sqlparams = [];
  sqlparams.push(req.userId);
  let parse = JSON.parse(req.body);
  let length = Object.keys(parse).length;
  console.log("length :" + length);
  for (var key in parse) {
    if (length > 1) {
      INSERT += key + ", ";
      sqlparams.push(parse[key]);
      VALUES += "?, ";
    } else {
      INSERT += key;
      sqlparams.push(parse[key]);
      VALUES += "?";
    }
    length = length - 1;
    //console.log(key)
    //console.log(parse[key])
  }
  INSERT += ") " + VALUES + ") ";
  console.log(INSERT);
  console.log(sqlparams);
  const results = await conn.execute(INSERT, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

// Events
// there was somthing we needed to add here
// 1) add check for if user blocked owner / owner blocked user
// 2) ???
export const getEvents = async (req: any) => {
  let sqlparams = [];
  sqlparams.push(req.userId);
  sqlparams.push(req.body.lon);
  sqlparams.push(req.body.lat);
  sqlparams.push(req.userId);
  sqlparams.push(req.userId);

  let SELECT =
    "SELECT E.name AS event_name, E.description, E.eventId, E.ownerId, E.startDate, E.endDate, COUNT(A.userId) AS attendee_count, CASE WHEN F.user IS NOT NULL THEN 1 ELSE 0 END AS is_friend ";
  let FROM =
    "FROM Event E JOIN Location L ON E.eventId = L.eventId LEFT JOIN eventAttendance A ON E.eventId = A.eventId LEFT JOIN Friends F ON E.ownerId = F.friend AND F.user = ? ";
  let WHERE =
    "WHERE ST_Distance_Sphere(POINT( ?, ?), POINT(lon, lat)) < 3100 AND E.endDate > NOW() ";
  let REST =
    "AND ? NOT IN (SELECT blocked FROM blockedUsers WHERE user = E.ownerId AND blocked = ?) GROUP BYE.eventId;";

  let SQL = SELECT + FROM + WHERE + REST;

  const results = await conn.execute(SQL, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const getEventById = async (req: any) => {
  let SQL = "SELECT * FROM Event WHERE eventId = ?";
  const sqlparams = [];
  console.log(req.params.eventId);
  sqlparams.push(req.params.eventId);
  console.log(sqlparams);
  const results = await conn.execute(SQL, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const updateEvent = async (req: any) => {
  let UPDATE = "UPDATE Event ";
  let SET = "SET ";
  let sqlparams = [];
  let parse = JSON.parse(req.body);
  let length = Object.keys(parse).length;
  console.log("length :" + length);
  for (var key in parse) {
    if (length > 1) {
      SET = SET + key + " = ?,";
      sqlparams.push(parse[key]);
    } else {
      SET = SET + key + " = ? ";
      sqlparams.push(parse[key]);
    }
    length = length - 1;
  }
  UPDATE = UPDATE + SET + " WHERE eventId = ?";
  sqlparams.push(req.params.eventId);
  const results = await conn.execute(UPDATE, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const createEvent = async (req: any) => {
  let INSERT = "INSERT INTO Event (";
  let VALUES = "VALUES (";
  let sqlparams = [];
  let parse = JSON.parse(req.body);
  let length = Object.keys(parse).length;
  console.log("length :" + length);
  for (var key in parse) {
    if (length > 1) {
      INSERT += key + ", ";
      sqlparams.push(parse[key]);
      VALUES += "?, ";
    } else {
      INSERT += key;
      sqlparams.push(parse[key]);
      VALUES += "?";
    }
    length = length - 1;
  }
  INSERT += ") " + VALUES + ") ";
  console.log(INSERT);
  console.log(sqlparams);
  const results = await conn.execute(INSERT, sqlparams);
  console.log(results);

  let EVENT_ID = "SELECT * FROM Event WHERE name = ? AND ownerId = ?";
  let parse2 = JSON.parse(req.body);
  let sqlparams2 = [parse2["name"], parse2["ownerId"]];
  const results2 = await conn.execute(EVENT_ID, sqlparams2, { as: "object" });
  const affectedRows = JSON.stringify(results2["rowsAffected"]);
  console.log(JSON.stringify(results2));
  console.log("rows affected: " + affectedRows);
  console.log(
    JSON.stringify((results2["rows"][0] as { eventId: number }).eventId)
  );

  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

// eventAttendance
// needs  changes , they will send an array in the qury params and we need to return  the details of each userId in the array
export const getEventAttendies = async (req: any) => {
  let SQL = "SELECT * FROM eventAttendance";
  //const results = await conn.execute(event.sql);
  const results = await conn.execute(SQL);
  //console.log(JSON.stringify(results,null,4));
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const addSelfToEvent = async (req: any) => {
  let SQL = "INSERT INTO eventAttendance (userId, eventId) VALUES (?,?)";
  let sqlparams = [];
  sqlparams.push(req.userId);
  sqlparams.push(req.params.eventId);
  const results = await conn.execute(SQL, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const leaveEvent = async (req: any) => {
  let SQL = "DELETE FROM eventAttendance WHERE userId = ? AND eventId = ?";
  let sqlparams = [];
  sqlparams.push(req.userId);
  sqlparams.push(req.params.eventId);
  const results = await conn.execute(SQL, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

export const removeFromEvent = async (req: any) => {
  let SQL = "DELETE FROM eventAttendance WHERE userId = ? AND eventId = ?";
  let sqlparams = [];
  sqlparams.push(req.params.userId);
  sqlparams.push(req.params.eventId);
  const results = await conn.execute(SQL, sqlparams);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};

//friend
export const addFriend = async (req: any) => {
  let friend_check =
    "SELECT * FROM pendingFriends WHERE (user = ? AND pending = ?) OR (user = ? AND pending = ?)";
  let sqlparams = [];
  sqlparams.push(req.userId);
  sqlparams.push(req.params.userId);
  sqlparams.push(req.params.userId);
  sqlparams.push(req.userId);
  const check_result = await conn.execute(friend_check, sqlparams);
  console.log(JSON.stringify(check_result));

  /*
  let INSERT = "INSERT INTO Event (";
  let VALUES = "VALUES (";
  let sqlparams = [];
  let parse = JSON.parse(req.body);
  let length = Object.keys(parse).length;
  console.log("length :" + length);
  for (var key in parse) {
    if (length > 1) {
      INSERT += key + ", ";
      sqlparams.push(parse[key]);
      VALUES += "?, ";
    } else {
      INSERT += key;
      sqlparams.push(parse[key]);
      VALUES += "?";
    }
    length = length - 1;
  }
  INSERT += ") " + VALUES + ") ";
  console.log(INSERT);
  console.log(sqlparams);
  const results = await conn.execute(INSERT, sqlparams);
  console.log(results);

  let EVENT_ID = "SELECT * FROM Event WHERE name = ? AND ownerId = ?";
  let parse2 = JSON.parse(req.body);
  let sqlparams2 = [parse2["name"], parse2["ownerId"]];
  const results2 = await conn.execute(EVENT_ID, sqlparams2, { as: "object" });
  const affectedRows = JSON.stringify(results2["rowsAffected"]);
  console.log(JSON.stringify(results2));
  console.log("rows affected: " + affectedRows);
  console.log(JSON.stringify(results2["rows"][0].eventId));

  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
  */
};

//friend
export const removeFriend = async (req: any) => {};
