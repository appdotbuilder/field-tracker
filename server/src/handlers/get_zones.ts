import { db } from '../db';
import { zonesTable } from '../db/schema';
import { type Zone } from '../schema';

export const getZones = async (): Promise<Zone[]> => {
  try {
    const results = await db.select()
      .from(zonesTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(zone => ({
      ...zone,
      // No numeric conversions needed for this table - all fields are already correct types
    }));
  } catch (error) {
    console.error('Failed to fetch zones:', error);
    throw error;
  }
};