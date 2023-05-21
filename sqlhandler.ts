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
  let SQL = "SELECT * FROM User WHERE userId = :userId";
  const results = await conn.execute(SQL, req);
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
  let body = JSON.parse(req.body);
  let UPDATE = "UPDATE User ";
  let keys = Object.keys(body);
  
  let SET = "SET ";
  keys.forEach((key, index) => {
    SET += ` ${key} = :${key}`;
    if (index < keys.length - 1) {
      SET += ", ";
    }
  })

  UPDATE += ` ${SET} WHERE userId = :userId`;

  body.userId = req.userId;
  const results = await conn.execute(UPDATE, body);
  
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
  let body = JSON.parse(req.body);
  body.userId = req.userId;
  let INSERT = "INSERT INTO User (";
  let VALUES = "VALUES (";
  let keys = Object.keys(body);

  keys.forEach((key, index) => {
    INSERT += key;
    VALUES += ` :${key}`;
    if (index < keys.length - 1) {
      INSERT += ", ";
      VALUES += ", ";
    }
  })
  
  INSERT += ") " + VALUES + ") ";
  
  const results = await conn.execute(INSERT, body);
  
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
  let body = JSON.parse(req.body);
  body.userId = req.userId;

  let SELECT =
    "SELECT E.name AS event_name, E.description, E.eventId, E.ownerId, E.startDate, E.endDate, COUNT(A.userId) AS attendee_count, CASE WHEN F.user IS NOT NULL THEN 1 ELSE 0 END AS is_friend ";
  let FROM =
    "FROM Event E JOIN Location L ON E.eventId = L.eventId LEFT JOIN eventAttendance A ON E.eventId = A.eventId LEFT JOIN Friends F ON E.ownerId = F.friend AND F.user = :userId ";
  let WHERE =
    "WHERE ST_Distance_Sphere(POINT(:lon, :lat), POINT(lon, lat)) < 3100 AND E.endDate > NOW() ";
  let REST =
    "AND :userId NOT IN (SELECT blocked FROM blockedUsers WHERE user = E.ownerId AND blocked = :userId) GROUP BYE.eventId;";

  let SQL = SELECT + FROM + WHERE + REST;

  const results = await conn.execute(SQL, body);
  
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

import Ably from "ably";

const rest = new Ably.Rest({ key: process.env.ABLY_KEY });

const createTokenRequest = async (capabilities, clientId) => {
  return new Promise((resolve, reject) => {
    rest.auth.createTokenRequest({ clientId, capability: JSON.stringify(capabilities) }, null, (err, tokenRequest) => {
      if (err) {
        reject(err);
      } else {
        resolve(tokenRequest);
      }
    });
  });
}

export const getChatTokenForEvent = async (req: any) => {
  const eventId = req.pathParameters.eventID;

  //Todo: combine all into one sql statement
  const groupDetails = await conn.execute('SELECT * FROM Event WHERE eventId = ?', [eventId]);
  if (groupDetails.rows.length === 0) {
    return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Event not found' }),
    };
  }

  const attendanceResult = await conn.execute('SELECT * FROM eventAttendance WHERE eventId = ? AND userId = ?', [eventId, userId]);
  if (attendanceResult.rows.length === 0) {
    return {
        statusCode: 403,
        body: JSON.stringify({ error: 'User not a member of event' }),
    };
  }

  const standardChannel = `tifapp:${eventId}`;
  const pinnedChannel = `tifapp:${eventId}-pinned`;

  const capabilities = { [standardChannel]: ['history'], [pinnedChannel]: ['history'] };
  const currentTime = Math.floor(Date.now() / 1000);

  if (currentTime <= groupDetails.rows[0].endDate) {
    capabilities[standardChannel].push(...['publish', 'subscribe']);
    capabilities[pinnedChannel].push(...['subscribe']);
  }

  if (groupDetails.rows[0].ownerId === userId) {
    capabilities[pinnedChannel].push('publish');
  }

  const tokenRequestData = await createTokenRequest(capabilities, userId);

  conn.refresh();
  return {
    statusCode: 200,
    body: JSON.stringify(tokenRequestData),
  };
};
