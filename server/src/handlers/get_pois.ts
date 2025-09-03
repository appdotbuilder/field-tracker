import { db } from '../db';
import { poisTable } from '../db/schema';
import { type PointOfInterest } from '../schema';

export const getPois = async (): Promise<PointOfInterest[]> => {
  try {
    const results = await db.select()
      .from(poisTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(poi => ({
      ...poi,
      latitude: parseFloat(poi.latitude),
      longitude: parseFloat(poi.longitude)
    }));
  } catch (error) {
    console.error('Failed to fetch POIs:', error);
    throw error;
  }
};