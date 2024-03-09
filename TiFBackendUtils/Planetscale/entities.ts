/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable quotes */
/*
* This file was generated by a tool.
* Rerun sql-ts to regenerate this file.
*/
export interface DBbanned {
  'banEnd': Date | null;
  'banStart': Date | null;
  'userId': string;
}
export interface DBevent {
  'color': '#EF6351'|'#CB9CF2'|'#88BDEA'|'#72B01D'|'#F7B2BD'|'#F4845F'|'#F6BD60';
  'createdAt'?: Date;
  'description': string;
  'endedAt': Date | null;
  'endTimestamp': Date;
  'hasEnded'?: boolean | null;
  'hostId': string;
  'id'?: number;
  'isChatEnabled': boolean;
  'latitude': number;
  'longitude': number;
  'shouldHideAfterStartDate': boolean;
  'startTimestamp': Date;
  'title': string;
  'updatedAt'?: Date;
}
export interface DBeventAttendance {
  'eventId': number;
  'joinTimestamp'?: Date | null;
  'role': 'hosting'|'attending';
  'userId': string;
}
export interface DBeventReports {
  'eventOwnerId': string;
  'eventReported': number;
  'reportDate'?: Date;
  'reportingReason': 'Spam'|'Harassment'|'Hate Speech'|'Violence'|'Scam or fraud'|'Suicide or self-harm'|'False information'|'Sale of illegal or regulated goods'|'Other';
  'userReporting': string;
}
export interface DBlocation {
  'city': string | null;
  'country': string | null;
  'isoCountryCode': string | null;
  'lat': number;
  'lon': number;
  'name': string | null;
  'postal_code': string | null;
  'region': string | null;
  'street': string | null;
  'street_num': string | null;
  'timeZone': string;
}
export interface DBpushTokens {
  'id'?: number;
  'platformName': 'apple'|'android';
  'pushToken': any | null;
  'userId': string;
}
export interface DBuser {
  'bio': string | null;
  'creationDate'?: Date;
  'handle': string;
  'id': string;
  'name': string;
  'profileImageURL': string | null;
  'updatedAt': Date | null;
}
export interface DBuserArrivals {
  'arrivedAt'?: Date;
  'latitude': number;
  'longitude': number;
  'userId': string;
}
export interface DBuserRelations {
  'fromUserId': string;
  'status': 'friends'|'friend-request-pending'|'blocked';
  'toUserId': string;
  'updatedAt'?: Date;
}
export interface DBuserReports {
  'reportDate'?: Date;
  'reportingReason': 'Spam'|'Harassment'|'Hate Speech'|'Violence'|'Scam or fraud'|'Suicide or self-harm'|'False information'|'Sale of illegal or regulated goods'|'Other';
  'userReported': number;
  'userReporting': number;
}
export interface DBuserSettings {
  'isAnalyticsEnabled'?: boolean;
  'isChatNotificationsEnabled'?: boolean;
  'isCrashReportingEnabled'?: boolean;
  'isEventNotificationsEnabled'?: boolean;
  'isFriendRequestNotificationsEnabled'?: boolean;
  'isMentionsNotificationsEnabled'?: boolean;
  'lastUpdatedAt'?: Date | null;
  'userId': string;
}
export interface DBViewEventAttendeeCount {
  'attendeeCount'?: number;
  'id'?: number;
}
export interface DBViewEventAttendees {
  'eventId': number;
  'userIds': string | null;
}
export interface DBViewEvents {
  'city': string | null;
  'color': '#EF6351'|'#CB9CF2'|'#88BDEA'|'#72B01D'|'#F7B2BD'|'#F4845F'|'#F6BD60';
  'country': string | null;
  'description': string;
  'endedAt': Date | null;
  'endTimestamp': Date;
  'handle': string | null;
  'hostId': string;
  'id'?: number;
  'isChatEnabled': boolean;
  'latitude': number;
  'longitude': number;
  'name': string | null;
  'profileImageURL': string | null;
  'relationHostToUser': 'friends'|'friend-request-pending'|'blocked' | null;
  'relationUserToHost': 'friends'|'friend-request-pending'|'blocked' | null;
  'shouldHideAfterStartDate': boolean;
  'startTimestamp': Date;
  'street': string | null;
  'street_num': string | null;
  'title': string;
  'userName': string | null;
}
export interface DBViewUserWithRelations {
  'bio': string | null;
  'creationDate'?: Date;
  'handle': string;
  'id': string;
  'name': string;
  'profileImageURL': string | null;
  'themToYouStatus': 'friends'|'friend-request-pending'|'blocked' | null;
  'updatedAt': Date | null;
  'youToThemStatus': 'friends'|'friend-request-pending'|'blocked' | null;
}
export interface DBcopy_state {
  'id'?: any;
  'lastpk': string | null;
  'table_name': string;
  'vrepl_id': number;
}
export interface DBdt_participant {
  'dtid': string;
  'id': number;
  'keyspace': string;
  'shard': string;
}
export interface DBdt_state {
  'dtid': string;
  'state': number;
  'time_created': number;
}
export interface DBheartbeat {
  'keyspaceShard': string;
  'tabletUid': any;
  'ts': any;
}
export interface DBpost_copy_action {
  'action': Object;
  'id'?: number;
  'table_name': string;
  'vrepl_id': number;
}
export interface DBredo_state {
  'dtid': string;
  'state': number;
  'time_created': number;
}
export interface DBredo_statement {
  'dtid': string;
  'id': number;
  'statement': any;
}
export interface DBreparent_journal {
  'action_name': string;
  'primary_alias': string;
  'replication_position': string | null;
  'time_created_ns': any;
}
export interface DBresharding_journal {
  'db_name': string | null;
  'id': number;
  'val': any | null;
}
export interface DBschema_migrations {
  'added_timestamp'?: Date;
  'added_unique_keys'?: any;
  'allow_concurrent'?: any;
  'artifacts': string;
  'cancelled_timestamp': Date | null;
  'cleanup_timestamp': Date | null;
  'completed_timestamp': Date | null;
  'component_throttled': string;
  'cutover_attempts'?: any;
  'ddl_action'?: string;
  'dropped_no_default_column_names': string;
  'eta_seconds'?: number;
  'expanded_column_names': string;
  'force_cutover'?: any;
  'id'?: any;
  'is_immediate_operation'?: any;
  'is_view'?: any;
  'keyspace': string;
  'last_cutover_attempt_timestamp': Date | null;
  'last_throttled_timestamp': Date | null;
  'liveness_timestamp': Date | null;
  'log_file'?: string;
  'log_path': string;
  'message': string;
  'migration_context'?: string;
  'migration_statement': string;
  'migration_status': string;
  'migration_uuid': string;
  'mysql_schema': string;
  'mysql_table': string;
  'options': string;
  'postpone_completion'?: any;
  'postpone_launch'?: any;
  'progress'?: number;
  'ready_timestamp': Date | null;
  'ready_to_complete'?: any;
  'ready_to_complete_timestamp': Date | null;
  'removed_foreign_key_names': string;
  'removed_unique_key_names': string;
  'removed_unique_keys'?: any;
  'requested_timestamp'?: Date;
  'retain_artifacts_seconds'?: number;
  'retries'?: any;
  'reverted_uuid'?: string;
  'revertible_notes': string;
  'reviewed_timestamp': Date | null;
  'rows_copied'?: any;
  'shard': string;
  'special_plan': string;
  'stage': string;
  'started_timestamp': Date | null;
  'strategy': string;
  'table_rows'?: number;
  'tablet'?: string;
  'tablet_failure'?: any;
  'user_throttle_ratio'?: number;
  'vitess_liveness_indicator'?: number;
}
export interface DBschema_version {
  'ddl': any | null;
  'id'?: number;
  'pos': string;
  'schemax': any;
  'time_updated': number;
}
export interface DBschemacopy {
  'character_set_name': string | null;
  'collation_name': string | null;
  'column_key': string;
  'column_name': string;
  'data_type': string;
  'ordinal_position': any;
  'table_name': string;
  'table_schema': string;
}
export interface DBtables {
  'CREATE_STATEMENT': string | null;
  'CREATE_TIME': number | null;
  'TABLE_NAME': string;
  'TABLE_SCHEMA': string;
}
export interface DBvdiff {
  'completed_at': Date | null;
  'created_at'?: Date;
  'db_name': string | null;
  'id'?: number;
  'keyspace': string | null;
  'last_error': string | null;
  'liveness_timestamp': Date | null;
  'options': Object | null;
  'shard': string;
  'started_at': Date | null;
  'state': string | null;
  'vdiff_uuid': string;
  'workflow': string | null;
}
export interface DBvdiff_log {
  'created_at'?: Date;
  'id'?: number;
  'message': string;
  'vdiff_id': number;
}
export interface DBvdiff_table {
  'created_at'?: Date;
  'lastpk': string | null;
  'mismatch'?: boolean;
  'report': Object | null;
  'rows_compared'?: number;
  'state': string | null;
  'table_name': string;
  'table_rows'?: number;
  'updated_at'?: Date;
  'vdiff_id': string;
}
export interface DBviews {
  'CREATE_STATEMENT': string | null;
  'TABLE_NAME': string;
  'TABLE_SCHEMA': string;
  'VIEW_DEFINITION': string;
}
export interface DBvreplication {
  'cell': string | null;
  'component_throttled'?: string;
  'db_name': string;
  'defer_secondary_keys'?: boolean;
  'id'?: number;
  'max_replication_lag': number;
  'max_tps': number;
  'message': string | null;
  'pos': string;
  'rows_copied'?: number;
  'source': any;
  'state': string;
  'stop_pos': string | null;
  'tablet_types': string | null;
  'tags'?: string;
  'time_heartbeat'?: number;
  'time_throttled'?: number;
  'time_updated': number;
  'transaction_timestamp': number;
  'workflow': string | null;
  'workflow_sub_type'?: number;
  'workflow_type'?: number;
}
export interface DBvreplication_log {
  'count'?: number;
  'created_at'?: Date | null;
  'id'?: number;
  'message': string;
  'state': string;
  'type': string;
  'updated_at'?: Date | null;
  'vrepl_id': number;
}
