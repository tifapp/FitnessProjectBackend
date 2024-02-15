/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
// KeyMappings definition remains the same
export type KeyMappings<T> = {
  [P: string]: Array<Extract<keyof T, string>>;
};

export type Transformed<T, Mappings extends KeyMappings<T>> = Omit<T, ExtractMappedKeys<Mappings>> & {
  [K in keyof Mappings]: { [P in Mappings[K][number]]: T[P] }
};

type ExtractMappedKeys<Mappings> = Mappings extends Record<string, Array<infer K>> ? K : never;

// Utility type to enforce that mappings keys are not in T
type EnsureMappingsKeysAreNotInT<T, Mappings> = Exclude<keyof Mappings, keyof T> extends never
  ? never
  : Mappings;

// Overload signatures incorporating the utility type
export function mapNestedFields<T>(obj: T): T;
export function mapNestedFields<T, Mappings extends KeyMappings<unknown>>(
  obj: T,
  mappings: EnsureMappingsKeysAreNotInT<T, Mappings>
): Transformed<T, Mappings>;

// Implementation
export function mapNestedFields<T, Mappings extends KeyMappings<unknown> | undefined> (
  obj: T,
  mappings?: Mappings
): T | Transformed<T, NonNullable<Mappings>> {
  if (!mappings) {
    return obj
  }

  // The main mapping logic
  const mapFields = <O, M extends KeyMappings<O>>(obj: O, mappings: M): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultObj = {} as any

    Object.keys(obj as any).forEach(key => {
      if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
        resultObj[key] = mapFields(obj[key], mappings)
      } else {
        resultObj[key] = obj[key]
      }
    })

    Object.entries(mappings).forEach(([newKey, originalKeys]) => {
      if (!resultObj.hasOwnProperty(newKey)) {
        resultObj[newKey] = originalKeys.reduce((acc, cur) => {
          if (obj.hasOwnProperty(cur)) {
            acc[cur] = obj[cur]
          }
          return acc
        }, {})
      }
    })

    // Clean up: Remove keys that have been mapped to a new key
    Object.values(mappings).flat().forEach((key: string) => {
      delete resultObj[key]
    })

    return resultObj
  }

  return mapFields(obj, mappings as KeyMappings<T>)
}
