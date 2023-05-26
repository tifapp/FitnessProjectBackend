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

/** 
██╗   ██╗███████╗███████╗██████╗ 
██║   ██║██╔════╝██╔════╝██╔══██╗
██║   ██║███████╗█████╗  ██████╔╝
██║   ██║╚════██║██╔══╝  ██╔══██╗
╚██████╔╝███████║███████╗██║  ██║
 ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
*/

// will need to change (currently waiting for responce from mathew for specifics on what he expects)

export const getUsers = async (req: UserList) => {
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

// Get a paginated list of blocked users
export const getBlockedUsers = async (req: any) => {
  let cursor = req.cursor;
  let SQL =
    "SELECT * FROM Blocked WHERE blockedDate > cursor ORDER BY id LIMIT 10";
  const results = await conn.execute(SQL);
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

// Block the given user
export const blockUser = async (req: any) => {
  let body = JSON.parse(req.body);
  let SQL = "INSERT INTO Blocked (user, blocked) VALUES (?, ?)";
  body.user = req.userId; // actual current user
  body.blocked = req.userId; // path params
  const results = await conn.execute(SQL, body);
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

// Unblock the given user
export const unblockUser = async (req: any) => {
  let body = JSON.parse(req.body);
  let SQL = "DELETE FROM Blocked WHERE user=? AND blocked=?";
  body.user = req.userId; // actual current user
  body.blocked = req.userId; // path params
  const results = await conn.execute(SQL, body);
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

// Get a single user
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

// Update your account settings
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
  });

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
  });

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

/** 
███████╗██╗   ██╗███████╗███╗   ██╗████████╗
██╔════╝██║   ██║██╔════╝████╗  ██║╚══██╔══╝
█████╗  ██║   ██║█████╗  ██╔██╗ ██║   ██║   
██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║   ██║   
███████╗ ╚████╔╝ ███████╗██║ ╚████║   ██║   
╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   
*/
// all event querys need relationship to host as well as event attendance list
// Events
// there was somthing we needed to add here
// 1) add check for if user blocked owner / owner blocked user
// 2) ???
export type Event = {
  host: EventAttendee;
  id: string;
  title: string;
  description: string;
  dateRange: FixedDateRange;
  color: EventColors;
  coordinates: LocationCoordinate2D;
  placemark?: Placemark;
  shouldHideAfterStartDate: boolean;
  attendeeCount: number;
};

export type LocationCoordinate2D = Readonly<{
  latitude: number;
  longitude: number;
}>;

export const getUserExploredEvents = async (
  userId: string,
  coordinates: LocationCoordinate2D,
  radiusMeters: number
) => {
  console.log("userId: " + userId);
  //let body = JSON.parse(req.body);

  let SQL = `SELECT E.name AS event_name, E.description, E.eventId, E.ownerId, E.startDate, E.endDate, COUNT(A.userId) AS attendee_count, 
  CASE WHEN F.user IS NOT NULL THEN 1 ELSE 0 END AS is_friend 
  FROM Event E JOIN Location L ON E.eventId = L.eventId 
  LEFT JOIN eventAttendance A ON E.eventId = A.eventId 
  LEFT JOIN Friends F ON E.ownerId = F.friend AND F.user = :userId 
  WHERE ST_Distance_Sphere(POINT(:longitude, :latitude), POINT(lon, lat)) < :radiusMeters 
  AND E.endDate > NOW() 
  AND :userId NOT IN (SELECT blocked 
  FROM blockedUsers 
  WHERE user = E.ownerId AND blocked = :userId) 
  GROUP BY E.eventId`;

  const results = await conn.execute(SQL, {
    userId,
    ...coordinates,
    radiusMeters,
  });

  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results.rows),
  };
};
// returns event details as well as event list of userId's
// Get single event
export const getEventById = async (req: any) => {
  let SQL = `SELECT Event.*, eventAttendance.userId 
  FROM Event INNER JOIN eventAttendance ON Event.eventId = eventAttendance.eventId 
  WHERE Event.eventId = ?`;
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

// Update single Event
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

// Create event
export const createEvent = async (req: any) => {
  let INSERT = "INSERT INTO event (";
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
  const results = yield conn.transaction(async (tx) => {
    const newEvent = await tx.execute(INSERT, sqlparams);
    const addOwnertoEvent = await tx.execute(
      `INSERT INTO eventAttendance
      (userId, eventId) VALUES (?, LAST_INSERT_ID())`,
      [parse["ownerId"]]
    );
  });
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results),
  };
};

// Delete single event
export const deleteEvent = async (req: any) => {
  let DELETE1 = "DELETE FROM Event WHERE eventId=?";
  let body = JSON.parse(req.body);
  body.userId = req.eventId; // from path params
  let DELETE2 = "DELETE FROM eventAttendance WHERE eventId=?";

  const results1 = await conn.execute(DELETE1, body);
  const results2 = await conn.execute(DELETE2, body);
  console.log(results);
  conn.refresh();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(results2.rows),
  };
};

/** 
███████╗██╗   ██╗███████╗███╗   ██╗████████╗ █████╗ ████████╗████████╗███████╗███╗   ██╗██████╗  █████╗ ███╗   ██╗ ██████╗███████╗
██╔════╝██║   ██║██╔════╝████╗  ██║╚══██╔══╝██╔══██╗╚══██╔══╝╚══██╔══╝██╔════╝████╗  ██║██╔══██╗██╔══██╗████╗  ██║██╔════╝██╔════╝
█████╗  ██║   ██║█████╗  ██╔██╗ ██║   ██║   ███████║   ██║      ██║   █████╗  ██╔██╗ ██║██║  ██║███████║██╔██╗ ██║██║     █████╗  
██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║   ██║   ██╔══██║   ██║      ██║   ██╔══╝  ██║╚██╗██║██║  ██║██╔══██║██║╚██╗██║██║     ██╔══╝  
███████╗ ╚████╔╝ ███████╗██║ ╚████║   ██║   ██║  ██║   ██║      ██║   ███████╗██║ ╚████║██████╔╝██║  ██║██║ ╚████║╚██████╗███████╗
╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
                                                                                                                                  
*/

// needs  changes , they will send an array in the qury params and we need to return  the details of each userId in the array

// Get paginated list of all event attendees
export const getEventAttendies = async (req: any) => {
  let cursor = req.cursor;
  let body = JSON.parse(req);
  body.eventId = req.eventId; // from path params
  let SQL =
    "SELECT * FROM eventAttendance WHERE eventId=? AND joinDate > cursor ORDER BY joinDate LIMIT 10";
  const results = await conn.execute(SQL, body);
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

// Join an event
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

// Leave an event
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

// Kick a user from an event
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

//

/** 
███████╗██████╗ ██╗███████╗███╗   ██╗██████╗ 
██╔════╝██╔══██╗██║██╔════╝████╗  ██║██╔══██╗
█████╗  ██████╔╝██║█████╗  ██╔██╗ ██║██║  ██║
██╔══╝  ██╔══██╗██║██╔══╝  ██║╚██╗██║██║  ██║
██║     ██║  ██║██║███████╗██║ ╚████║██████╔╝
╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═══╝╚═════╝ 
*/

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
