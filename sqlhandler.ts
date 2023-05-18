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

export const getAllUsers = async (req) => {
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

export const getUserById = async (req) => {
  let SQL = "SELECT * FROM User WHERE userId = ?";
  const sqlparams = [];
  console.log(req.params.userId);
  sqlparams.push(req.params.userId);
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

export const updateUser = async (req) => {
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

export const createUser = async (req) => {
  let INSERT = "INSERT INTO User (";
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

export const getEvents = async (req) => {
  let sqlparams = [];
  sqlparams.push(req.body.lon);
  sqlparams.push(req.body.lat);
  sqlparams.push(req.body.userId);
  let SELECT =
    "SELECT E.name AS event_name, E.description, E.eventId, E.ownerId, E.startDate, E.endDate, COUNT(A.userId) AS attendee_count, CASE WHEN F.user IS NOT NULL THEN 1 ELSE 0 END AS is_friend ";
  let FROM =
    "FROM Event E JOIN Location L ON E.eventId = L.eventId LEFT JOIN eventAttendance A ON E.eventId = A.eventId LEFT JOIN Friends F ON E.ownerId = F.friend AND F.user = 1 ";
  let WHERE =
    "WHERE ST_Distance_Sphere(POINT( ?, ?), POINT(lon, lat)) < 3100 AND E.endDate > NOW() ";
  let REST =
    "AND 1 NOT IN (SELECT blocked FROM blockedUsers WHERE user = E.ownerId AND blocked = ?) GROUP BYE.eventId;";

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

export const getEventById = async (req) => {
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

export const updateEvent = async (req) => {
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

export const createEvent = async (req) => {
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
export const getEventAttendies = async (req) => {
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

export const getEventForUser = async (req) => {
  let SQL = "SELECT * FROM eventAttendance WHERE UserId = ?";
  let sqlparams = [];
  sqlparams.push(req.params.userId);
  //const results = await conn.execute(event.sql);
  const results = await conn.execute(SQL, sqlparams);
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

export const addAttendieToEvent = async (req) => {
  let SQL = "INSERT INTO eventAttendance (userId, eventId) VALUES (?,?)";
  let sqlparams = [];
  sqlparams.push(req.body.userId);
  sqlparams.push(req.body.eventId);
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

export const removeFromEvent = async (req) => {
  let SQL = "DELETE FROM eventAttendance WHERE userId = ?";
  let sqlparams = [];
  sqlparams.push(req.params.userId);
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
