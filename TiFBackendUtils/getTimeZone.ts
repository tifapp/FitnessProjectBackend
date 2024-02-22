import { find } from "geo-tz"

export const getTimeZone = (coordinate: {latitude: number, longitude: number}) => {
  return find(coordinate.latitude, coordinate.longitude)
}