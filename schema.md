### banned

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| banEnd | Date | Yes | None |
| banStart | Date | Yes | None |
| userId | string | No | None |

### event

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| color | string | No | None |
| createdDateTime | Date | No | CURRENT_TIMESTAMP |
| description | string | No | None |
| endDateTime | Date | No | None |
| endedDateTime | Date | Yes | None |
| hostId | string | No | None |
| id | number | No | None |
| isChatEnabled | boolean | No | None |
| latitude | number | No | None |
| longitude | number | No | None |
| shouldHideAfterStartDate | boolean | No | None |
| startDateTime | Date | No | None |
| title | string | No | None |
| updatedDateTime | Date | No | CURRENT_TIMESTAMP |

### eventAttendance

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| eventId | number | No | None |
| joinedDateTime | Date | No | CURRENT_TIMESTAMP |
| role | 'hosting'|'attending' | No | None |
| userId | string | No | None |

### EventAttendeeCountView

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| attendeeCount | number | No | 0 |
| id | number | No | 0 |

### EventAttendeesView

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| eventId | number | No | None |
| userIds | string | Yes | None |

### eventReports

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| eventOwnerId | string | No | None |
| eventReported | number | No | None |
| reportDate | Date | No | CURRENT_TIMESTAMP |
| reportingReason | 'Spam'|'Harassment'|'Hate Speech'|'Violence'|'Scam or fraud'|'Suicide or self-harm'|'False information'|'Sale of illegal or regulated goods'|'Other' | No | None |
| userReporting | string | No | None |

### location

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| city | string | Yes | None |
| country | string | Yes | None |
| createdDateTime | Date | No | CURRENT_TIMESTAMP |
| isoCountryCode | string | Yes | None |
| latitude | number | No | None |
| longitude | number | No | None |
| name | string | Yes | None |
| postalCode | string | Yes | None |
| region | string | Yes | None |
| street | string | Yes | None |
| streetNumber | string | Yes | None |
| timezoneIdentifier | string | No | None |

### pushTokens

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| id | number | No | None |
| platformName | 'apple'|'android' | No | None |
| pushToken | any | Yes | None |
| userId | string | No | None |

### TifEventView

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| city | string | Yes | None |
| color | string | No | None |
| country | string | Yes | None |
| createdDateTime | Date | No | CURRENT_TIMESTAMP |
| description | string | No | None |
| endDateTime | Date | No | None |
| endedDateTime | Date | Yes | None |
| hasArrived | boolean | No | 0 |
| hostHandle | string | No | None |
| hostId | string | No | None |
| hostUsername | string | No | None |
| id | number | No | 0 |
| isChatEnabled | boolean | No | None |
| isoCountryCode | string | Yes | None |
| latitude | number | No | None |
| longitude | number | No | None |
| placemarkName | string | Yes | None |
| postalCode | string | Yes | None |
| region | string | Yes | None |
| shouldHideAfterStartDate | boolean | No | None |
| startDateTime | Date | No | None |
| street | string | Yes | None |
| streetNumber | string | Yes | None |
| timezoneIdentifier | string | Yes | None |
| title | string | No | None |
| updatedDateTime | Date | No | CURRENT_TIMESTAMP |

### user

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| bio | string | Yes | None |
| createdDateTime | Date | No | CURRENT_TIMESTAMP |
| handle | import("../../TiFShared/domain-models/User.js").UserHandle | No | None |
| id | string | No | None |
| name | string | No | None |
| profileImageURL | string | Yes | None |
| updatedDateTime | Date | No | CURRENT_TIMESTAMP |

### userArrivals

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| arrivedDateTime | Date | No | CURRENT_TIMESTAMP |
| latitude | number | No | None |
| longitude | number | No | None |
| userId | string | No | None |

### userRelations

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| fromUserId | string | No | None |
| status | 'friends'|'friend-request-pending'|'blocked' | No | None |
| toUserId | string | No | None |
| updatedDateTime | Date | No | CURRENT_TIMESTAMP |

### userReports

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| reportDate | Date | No | CURRENT_TIMESTAMP |
| reportingReason | 'Spam'|'Harassment'|'Hate Speech'|'Violence'|'Scam or fraud'|'Suicide or self-harm'|'False information'|'Sale of illegal or regulated goods'|'Other' | No | None |
| userReported | number | No | None |
| userReporting | number | No | None |

### userSettings

| Property | Data Type | Nullable | Default Value |
|----------|-----------|----------|---------------|
| isAnalyticsEnabled | boolean | No | 1 |
| isChatNotificationsEnabled | boolean | No | 1 |
| isCrashReportingEnabled | boolean | No | 1 |
| isEventNotificationsEnabled | boolean | No | 1 |
| isFriendRequestNotificationsEnabled | boolean | No | 1 |
| isMentionsNotificationsEnabled | boolean | No | 1 |
| updatedDateTime | Date | Yes | CURRENT_TIMESTAMP |
| userId | string | No | None |

