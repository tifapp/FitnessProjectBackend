export const tableDefintionsByFamily = [
  [
    `
    CREATE TABLE IF NOT EXISTS user (
    id char(36) NOT NULL,
    name varchar(50) NOT NULL,
    handle varchar(15) NOT NULL,
    createdDateTime datetime(3) NOT NULL DEFAULT current_timestamp(3),
    updatedDateTime datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
    bio varchar(500),
    profileImageURL varchar(200),
    PRIMARY KEY (id),
    UNIQUE KEY handle (handle),
    CONSTRAINT format_user_handle CHECK (REGEXP_LIKE(handle, _utf8mb4 '^[a-z_0-9]{1,15}$'))
    )
    `
  ],
  [
    `
    CREATE TABLE IF NOT EXISTS event (
    id bigint NOT NULL AUTO_INCREMENT,
    description varchar(1000) NOT NULL,
    startDateTime datetime(3) NOT NULL,
    endDateTime datetime(3) NOT NULL,
    hostId char(36) NOT NULL,
    color varchar(9) NOT NULL,
    title varchar(100) NOT NULL,
    shouldHideAfterStartDate tinyint(1) NOT NULL,
    isChatEnabled tinyint(1) NOT NULL,
    latitude decimal(10,7) NOT NULL,
    longitude decimal(10,7) NOT NULL,
    createdDateTime datetime(3) NOT NULL DEFAULT current_timestamp(3),
    updatedDateTime datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
    endedDateTime datetime(3),
    PRIMARY KEY (id),
    UNIQUE KEY unique_event_id (id),
    KEY event_host_must_exist (hostId),
    KEY idx_startDateTime (startDateTime),
    CONSTRAINT event_host_must_exist FOREIGN KEY (hostId) REFERENCES user (id),
    CONSTRAINT event_must_end_after_start CHECK (startDateTime < endDateTime),
    CONSTRAINT format_event_color CHECK (REGEXP_LIKE(color, _utf8mb4 '^#[0-9A-Fa-f]{6}$'))
    )
    `
  ],
  [
    `
    CREATE TABLE IF NOT EXISTS banned (
    userId char(36) NOT NULL,
    banStart date,
    banEnd date,
    PRIMARY KEY (userId),
    UNIQUE KEY temp_unique_key (userId)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS eventAttendance (
    userId char(36) NOT NULL,
    eventId bigint NOT NULL,
    joinedDateTime datetime(3) NOT NULL DEFAULT current_timestamp(3),
    role enum('hosting', 'attending') NOT NULL,
    PRIMARY KEY (userId, eventId),
    KEY event_must_exist (eventId),
    KEY idx_joinedDateTime (joinedDateTime),
    CONSTRAINT attendee_must_exist FOREIGN KEY (userId) REFERENCES user (id),
    CONSTRAINT event_must_exist FOREIGN KEY (eventId) REFERENCES event (id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS eventReports (
    userReporting varchar(50) NOT NULL,
    eventReported bigint NOT NULL,
    reportingReason enum('Spam', 'Harassment', 'Hate Speech', 'Violence', 'Scam or fraud', 'Suicide or self-harm', 'False information', 'Sale of illegal or regulated goods', 'Other') NOT NULL,
    reportDate datetime(3) NOT NULL DEFAULT current_timestamp(3),
    eventOwnerId varchar(36) NOT NULL,
    PRIMARY KEY (userReporting, eventReported)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS location (
    name varchar(255),
    city varchar(255),
    country varchar(255),
    street varchar(255),
    streetNumber varchar(255),
    latitude decimal(10,7) NOT NULL,
    longitude decimal(10,7) NOT NULL,
    timezoneIdentifier varchar(255) NOT NULL,
    postalCode varchar(255),
    region varchar(255),
    isoCountryCode varchar(255),
    createdDateTime datetime(3) NOT NULL DEFAULT current_timestamp(3),
    PRIMARY KEY (latitude, longitude)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS pushTokens (
    id bigint NOT NULL AUTO_INCREMENT,
    userId char(36) NOT NULL,
    pushToken tinyblob,
    platformName enum('apple', 'android') NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uniquePlatformNameTokenAndUserId (userId, pushToken(255), platformName),
    CONSTRAINT device_owner_must_exist FOREIGN KEY (userId) REFERENCES user (id)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS userArrivals (
    userId char(36) NOT NULL,
    latitude decimal(10,7) NOT NULL,
    longitude decimal(10,7) NOT NULL,
    arrivedDateTime datetime(3) NOT NULL DEFAULT current_timestamp(3),
    PRIMARY KEY (userId, latitude, longitude),
    KEY sort_by_recent_arrivals (userId, arrivedDateTime),
    CONSTRAINT arriving_user_must_exist FOREIGN KEY (userId) REFERENCES user (id)
    ) ENGINE InnoDB,
      CHARSET utf8mb4,
      COLLATE utf8mb4_0900_ai_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS userRelations (
    status enum('friends', 'friend-request-pending', 'blocked') NOT NULL,
    updatedDateTime datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
    fromUserId char(36) NOT NULL,
    toUserId char(36) NOT NULL,
    PRIMARY KEY (fromUserId, toUserId),
    CONSTRAINT prevent_relation_with_self CHECK (fromUserId != toUserId)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS userReports (
    userReporting bigint NOT NULL,
    userReported bigint NOT NULL,
    reportingReason enum(
      'Spam', 
      'Harassment', 
      'Hate Speech', 
      'Violence', 
      'Scam or fraud', 
      'Suicide or self-harm', 
      'False information', 
      'Sale of illegal or regulated goods', 
      'Other'
    ) NOT NULL,
    reportDate datetime(3) NOT NULL DEFAULT current_timestamp(3),
    PRIMARY KEY (userReporting, userReported)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS userSettings (
    userId varchar(36) NOT NULL,
    isAnalyticsEnabled tinyint(1) NOT NULL DEFAULT '1',
    isCrashReportingEnabled tinyint(1) NOT NULL DEFAULT '1',
    canShareArrivalStatus tinyint(1) NOT NULL DEFAULT '1',
    eventCalendarStartOfWeekDay enum('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') NOT NULL DEFAULT 'monday',
    eventCalendarDefaultLayout enum('single-day-layout', 'week-layout', 'month-layout') NOT NULL DEFAULT 'month-layout',
    eventPresetShouldHideAfterStartDate tinyint(1) NOT NULL DEFAULT '1',
    eventPresetPlacemark JSON, 
    eventPresetDurations JSON,
    version bigint NOT NULL DEFAULT '0',
    updatedDateTime timestamp(3) NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
    pushNotificationTriggerIds JSON,
    CHECK (
        JSON_CONTAINS(
          JSON_ARRAY(
            '"friend-request-received"', 
            '"friend-request-accepted"', 
            '"user-entered-region"', 
            '"event-attendance-headcount"', 
            '"event-periodic-arrivals"', 
            '"event-starting-soon"', 
            '"event-started"', 
            '"event-ended"',
            '"event-name-changed"',
            '"event-description-changed"',
            '"event-time-changed"',
            '"event-location-changed"',
            '"event-cancelled"'
          ), 
          JSON_EXTRACT(pushNotificationTriggerIds, '$[*]')
        )
    ),
    PRIMARY KEY (userId),
    CONSTRAINT user_must_exist FOREIGN KEY (userId) REFERENCES user (id)
    )
    `
  ],
  [
    `
    CREATE VIEW TifEventView 
    AS SELECT e.id AS id, 
    e.color AS color, 
    e.description AS description,
    e.title AS title,
    e.hostId AS hostId,
    e.shouldHideAfterStartDate AS shouldHideAfterStartDate,
    e.isChatEnabled AS isChatEnabled,
    e.createdDateTime AS createdDateTime,
    e.updatedDateTime AS updatedDateTime, host.name AS hostUsername,
    host.handle AS hostHandle, 
    e.startDateTime AS startDateTime,
    e.endDateTime AS endDateTime,
    e.latitude AS latitude,
    e.longitude AS longitude,
    L.name AS placemarkName,
    L.city AS city, L.country AS country,
    L.street AS street, L.region AS region,
    L.streetNumber AS streetNumber,
    L.timezoneIdentifier AS timezoneIdentifier,
    L.postalCode AS postalCode,
    L.isoCountryCode AS isoCountryCode,
    ua.userId IS NOT NULL AS hasArrived,
    e.endedDateTime AS endedDateTime FROM (((event AS e LEFT JOIN userArrivals AS ua ON e.latitude = ua.latitude AND e.longitude = ua.longitude) LEFT JOIN location AS L ON e.latitude = L.latitude AND e.longitude = L.longitude) JOIN user AS host ON host.id = e.hostId);
    `,
    `
    CREATE VIEW EventAttendeeCountView 
    AS SELECT E.id AS id, 
    COUNT(A.eventId) AS attendeeCount
    FROM (eventAttendance AS A JOIN event AS E ON E.id = A.eventId) 
    GROUP BY A.eventId;
    `,
    `
    CREATE VIEW EventAttendeesView 
    AS SELECT ea1.eventId AS eventId,
    GROUP_CONCAT(DISTINCT ea1.userId 
    ORDER BY ea1.joinedDateTime ASC SEPARATOR ',') AS userIds 
    FROM eventAttendance AS ea1 
    GROUP BY ea1.eventId;
    `
  ]
]
