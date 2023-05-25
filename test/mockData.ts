import { faker } from "@faker-js/faker";

/**
 * Generates a mock coordinate for testing and UI purposes.
 */
export const mockLocationCoordinate2D = () => ({
  latitude: parseFloat(faker.address.latitude()),
  longitude: parseFloat(faker.address.longitude()),
});
