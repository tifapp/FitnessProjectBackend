### Banned
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| banEnd | Date | true | None |
| banStart | Date | true | None |
| userId | string | false | None |

### Event
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| color | import("./node_modules/TiFShared/domain-models/ColorString").ColorString | true | None |
| createdDateTime | Date | false | CURRENT_TIMESTAMP(3) |
| description | string | true | None |
| endDateTime | Date | false | None |
| endedDateTime | Date | true | None |
| hostId | string | false | None |
| id | number | false | None |
| isChatEnabled | boolean | false | 1 |
| latitude | number | false | None |
| longitude | number | false | None |
| shouldHideAfterStartDate | boolean | false | 0 |
| startDateTime | Date | false | None |
| title | string | false | None |
| updatedDateTime | Date | false | CURRENT_TIMESTAMP(3) |

### Event Attendance
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| eventId | number | false | None |
| joinedDateTime | Date | false | CURRENT_TIMESTAMP(3) |
| role | 'hosting'|'attending' | false | None |
| userId | string | false | None |

### Event Attendee Count View
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| attendeeCount | number | false | 0 |
| id | number | false | 0 |

### Event Attendees View
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| eventId | number | false | None |
| userIds | string | true | None |

### Event Reports
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| eventOwnerId | string | false | None |
| eventReported | number | false | None |
| reportDate | Date | false | CURRENT_TIMESTAMP(3) |
| reportingReason | 'Spam'|'Harassment'|'Hate Speech'|'Violence'|'Scam or fraud'|'Suicide or self-harm'|'False information'|'Sale of illegal or regulated goods'|'Other' | false | None |
| userReporting | string | false | None |

### Location
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| city | string | true | None |
| country | string | true | None |
| createdDateTime | Date | false | CURRENT_TIMESTAMP(3) |
| isoCountryCode | string | true | None |
| latitude | number | false | None |
| longitude | number | false | None |
| name | string | true | None |
| postalCode | string | true | None |
| region | string | true | None |
| street | string | true | None |
| streetNumber | string | true | None |
| timezoneIdentifier | string | false | None |

### Push Tokens
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| id | number | false | None |
| platformName | 'apple'|'android' | false | None |
| pushToken | any | true | None |
| userId | string | false | None |

### TiF Event View
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| city | string | true | None |
| color | import("./node_modules/TiFShared/domain-models/ColorString").ColorString | true | None |
| country | string | true | None |
| createdDateTime | Date | false | CURRENT_TIMESTAMP(3) |
| description | string | true | None |
| endDateTime | Date | false | None |
| endedDateTime | Date | true | None |
| hasArrived | boolean | false | 0 |
| hostHandle | import("./node_modules/TiFShared/domain-models/User").UserHandle | false | None |
| hostId | string | false | None |
| hostName | string | false | None |
| id | number | false | 0 |
| isChatEnabled | boolean | false | 1 |
| isoCountryCode | string | true | None |
| latitude | number | false | None |
| longitude | number | false | None |
| placemarkName | string | true | None |
| postalCode | string | true | None |
| region | string | true | None |
| shouldHideAfterStartDate | boolean | false | 0 |
| startDateTime | Date | false | None |
| street | string | true | None |
| streetNumber | string | true | None |
| timezoneIdentifier | string | true | None |
| title | string | false | None |
| updatedDateTime | Date | false | CURRENT_TIMESTAMP(3) |

### User
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| bio | string | true | None |
| createdDateTime | Date | false | CURRENT_TIMESTAMP(3) |
| handle | import("./node_modules/TiFShared/domain-models/User").UserHandle | false | None |
| id | string | false | None |
| name | string | false | None |
| profileImageURL | string | true | None |
| updatedDateTime | Date | false | CURRENT_TIMESTAMP(3) |

### User Arrivals
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| arrivedDateTime | Date | false | CURRENT_TIMESTAMP(3) |
| latitude | number | false | None |
| longitude | number | false | None |
| userId | string | false | None |

### User Relations
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| fromUserId | string | false | None |
| status | 'friends'|'friend-request-pending'|'blocked' | false | None |
| toUserId | string | false | None |
| updatedDateTime | Date | false | CURRENT_TIMESTAMP(3) |

### User Reports
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| reportDate | Date | false | CURRENT_TIMESTAMP(3) |
| reportingReason | 'Spam'|'Harassment'|'Hate Speech'|'Violence'|'Scam or fraud'|'Suicide or self-harm'|'False information'|'Sale of illegal or regulated goods'|'Other' | false | None |
| userReported | number | false | None |
| userReporting | number | false | None |

### User Settings
| Property | Type | Optional | DefaultValue |
| ---------- | ---------- | ---------- | ---------- |
| canShareArrivalStatus | boolean | false | 1 |
| eventCalendarDefaultLayout | 'single-day-layout'|'week-layout'|'month-layout' | false | week-layout |
| eventCalendarStartOfWeekDay | 'sunday'|'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday' | false | monday |
| eventPresetDurations | number[] | false | json_array(900,1800,2700,3600,5400) |
| eventPresetPlacemark | import("./node_modules/TiFShared/domain-models/Event").EventEditLocation | true | None |
| eventPresetShouldHideAfterStartDate | boolean | false | 0 |
| isAnalyticsEnabled | boolean | false | 1 |
| isCrashReportingEnabled | boolean | false | 1 |
| pushNotificationTriggerIds | import("./node_modules/TiFShared/domain-models/Settings").UserSettings["pushNotificationTriggerIds"] | false | json_array(_utf8mb4\'friend-request-received\',_utf8mb4\'friend-request-accepted\',_utf8mb4\'user-entered-region\',_utf8mb4\'event-attendance-headcount\',_utf8mb4\'event-periodic-arrivals\',_utf8mb4\'event-starting-soon\',_utf8mb4\'event-started\',_utf8mb4\'event-ended\',_utf8mb4\'event-name-changed\',_utf8mb4\'event-description-changed\',_utf8mb4\'event-time-changed\',_utf8mb4\'event-location-changed\',_utf8mb4\'event-cancelled\') |
| updatedDateTime | Date | true | CURRENT_TIMESTAMP(3) |
| userId | string | false | None |
| version | number | false | 0 |
