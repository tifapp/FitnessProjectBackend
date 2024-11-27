import { DatabaseValueConvertible } from "TiFShared/lib/Database"

type DatabaseValue = undefined | Date | boolean | number | string | number[] | string[] | DatabaseValueConvertible

export type SQLParams =
  | undefined
  | Record<string, DatabaseValue>
  | (number | string)[]

const paramify = (value: DatabaseValue) =>
  value == null
    ? null
    : typeof value === "object" && "toDatabaseValue" in value
      ? value.toDatabaseValue()
      : value

export const paramifyArgs = (args: SQLParams) =>
  args == null
    ? args
    : Array.isArray(args)
      ? args.map(paramify)
      : Object.keys(args).reduce((acc, key) => {
        acc[key] = paramify(args[key])
        return acc
      }, {} as Record<string, unknown>)
