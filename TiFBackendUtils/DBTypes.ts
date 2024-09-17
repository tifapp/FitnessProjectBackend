/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable quotes */
/*
* This file was generated by a tool.
* Rerun sql-ts to regenerate this file.
*/
export interface DBbanned {
  'banEnd': Date | undefined;
  'banStart': Date | undefined;
  'userId': string;
}
export interface DBevent {
  'color': import("./node_modules/TiFShared/domain-models/ColorString").ColorString;
  'createdDateTime': Date;
  'description': string;
  'endDateTime': Date;
  'endedDateTime': Date | undefined;
  'hostId': string;
  'id': number;
  'isChatEnabled': boolean;
  'latitude': number;
  'longitude': number;
  'shouldHideAfterStartDate': boolean;
  'startDateTime': Date;
  'title': string;
  'updatedDateTime': Date;
}
export interface DBeventAttendance {
  'eventId': number;
  'joinedDateTime': Date;
  'role': 'hosting'|'attending';
  'userId': string;
}
export interface DBEventAttendeeCountView {
  'attendeeCount': number;
  'id': number;
}
export interface DBEventAttendeesView {
  'eventId': number;
  'userIds': string | undefined;
}
export interface DBeventReports {
  'eventOwnerId': string;
  'eventReported': number;
  'reportDate': Date;
  'reportingReason': 'Spam'|'Harassment'|'Hate Speech'|'Violence'|'Scam or fraud'|'Suicide or self-harm'|'False information'|'Sale of illegal or regulated goods'|'Other';
  'userReporting': string;
}
export interface DBlocation {
  'city': string | undefined;
  'country': string | undefined;
  'createdDateTime': Date;
  'isoCountryCode': string | undefined;
  'latitude': number;
  'longitude': number;
  'name': string | undefined;
  'postalCode': string | undefined;
  'region': string | undefined;
  'street': string | undefined;
  'streetNumber': string | undefined;
  'timezoneIdentifier': string;
}
export interface DBpushTokens {
  'id': number;
  'platformName': 'apple'|'android';
  'pushToken': any | undefined;
  'userId': string;
}
export interface DBTifEventView {
  'city': string | undefined;
  'color': import("./node_modules/TiFShared/domain-models/ColorString").ColorString;
  'country': string | undefined;
  'createdDateTime': Date;
  'description': string;
  'endDateTime': Date;
  'endedDateTime': Date | undefined;
  'hasArrived': boolean;
  'hostHandle': import("./node_modules/TiFShared/domain-models/User").UserHandle;
  'hostId': string;
  'hostName': string;
  'id': number;
  'isChatEnabled': boolean;
  'isoCountryCode': string | undefined;
  'latitude': number;
  'longitude': number;
  'placemarkName': string | undefined;
  'postalCode': string | undefined;
  'region': string | undefined;
  'shouldHideAfterStartDate': boolean;
  'startDateTime': Date;
  'street': string | undefined;
  'streetNumber': string | undefined;
  'timezoneIdentifier': string | undefined;
  'title': string;
  'updatedDateTime': Date;
}
export interface DBuser {
  'bio': string | undefined;
  'createdDateTime': Date;
  'handle': import("./node_modules/TiFShared/domain-models/User").UserHandle;
  'id': string;
  'name': string;
  'profileImageURL': string | undefined;
  'updatedDateTime': Date;
}
export interface DBuserArrivals {
  'arrivedDateTime': Date;
  'latitude': number;
  'longitude': number;
  'userId': string;
}
export interface DBuserRelations {
  'fromUserId': string;
  'status': 'friends'|'friend-request-pending'|'blocked';
  'toUserId': string;
  'updatedDateTime': Date;
}
export interface DBuserReports {
  'reportDate': Date;
  'reportingReason': 'Spam'|'Harassment'|'Hate Speech'|'Violence'|'Scam or fraud'|'Suicide or self-harm'|'False information'|'Sale of illegal or regulated goods'|'Other';
  'userReported': number;
  'userReporting': number;
}
export interface DBuserSettings {
  'canShareArrivalStatus': boolean;
  'eventCalendarDefaultLayout': 'single-day-layout'|'week-layout'|'month-layout';
  'eventCalendarStartOfWeekDay': 'sunday'|'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday';
  'eventPresetDurations': number[];
  'eventPresetPlacemark': import("./node_modules/TiFShared/domain-models/Event").EventEditLocation | undefined;
  'eventPresetShouldHideAfterStartDate': boolean;
  'isAnalyticsEnabled': boolean;
  'isCrashReportingEnabled': boolean;
  'pushNotificationTriggerIds': import("./node_modules/TiFShared/domain-models/Settings").UserSettings["pushNotificationTriggerIds"];
  'updatedDateTime': Date | undefined;
  'userId': string;
  'version': number;
}
