export type KeyMappings<T> = Record<string, Array<Extract<keyof T, string>>>;

export type Transformed<T, Mappings extends KeyMappings<T>> = Omit<T, ExtractMappedKeys<Mappings>> & {
    [K in keyof Mappings]: { [P in Mappings[K][number]]: T[P] }
};

type ExtractMappedKeys<Mappings> = Mappings extends Record<string, Array<infer K>> ? K : never;

// Overload signatures
export function mapNestedFields<T>(obj: T): T;
export function mapNestedFields<T, Mappings extends KeyMappings<T>>(obj: T, mappings: Mappings): Transformed<T, Mappings>;
export function mapNestedFields<T, Mappings extends KeyMappings<T> | undefined> (
  obj: T,
  mappings?: Mappings
): T | Transformed<T, NonNullable<Mappings>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultObj = obj as any

  if (!mappings) {
    return obj
  }

  Object.entries(mappings as KeyMappings<T>).forEach(([nestedKey, relationKeys]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resultObj[nestedKey] = {} as any

    relationKeys.forEach((key) => {
      resultObj[nestedKey][key] = resultObj[key]
      delete resultObj[key]
    })
  })

  return resultObj
}
