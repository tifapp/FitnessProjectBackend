import { z } from "zod"

/**
 * A zod schema for an {@link LocationCoordinate2D}.
 */
export const LocationCoordinates2DSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

/**
 * A type representing a latitude and longitude coordinate.
 */
export type LocationCoordinate2D = Readonly<
  z.infer<typeof LocationCoordinates2DSchema>
>

export interface Placemark {
  lat: number
  lon: number
  name: string
  city: string
  country: string
  street: string
  street_num: number
  unit_number: string // camelCase
  timeZone: string
}
