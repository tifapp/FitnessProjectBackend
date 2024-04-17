// TODO: - Move these to TiFShared

export type NullablePartial<T> = {
  [P in keyof T]?: T[P] | null
}

export type RequireNotNull<T> = {
  [P in keyof T]: NonNullable<T[P]>
}
