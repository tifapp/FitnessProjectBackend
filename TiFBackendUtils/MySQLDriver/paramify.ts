export type SQLParams =
  | undefined
  | Record<string, unknown>
  | (number | string)[]

const paramify = (value: unknown) =>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore .toJSON() here causes a build issue for some reason
  // NB: instanceof checks don't work for UserHandle/ColorString, possibly due to peer dependencies
  value == null
    ? null
    : value.constructor.name === "UserHandle" ||
      value.constructor.name === "ColorString"
    ? value.toJSON()
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
