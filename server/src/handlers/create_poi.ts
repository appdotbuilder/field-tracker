import { db } from '../db';
import { poisTable, usersTable } from '../db/schema';
import { type CreatePoiInput, type PointOfInterest } from '../schema';
import { eq } from 'drizzle-orm';

export const createPoi = async (input: CreatePoiInput): Promise<PointOfInterest> => {
  try {
    // Validate that the creating user exists and has admin role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'admin') {
      throw new Error('Only admin users can create POIs');
    }

    // Validate latitude and longitude coordinates
    if (input.latitude < -90 || input.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (input.longitude < -180 || input.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }

    // Insert POI record
    const result = await db.insert(poisTable)
      .values({
        name: input.name,
        description: input.description,
        latitude: input.latitude.toString(), // Convert number to string for numeric column
        longitude: input.longitude.toString(), // Convert number to string for numeric column
        poi_type: input.poi_type,
        created_by: input.created_by
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const poi = result[0];
    return {
      ...poi,
      latitude: parseFloat(poi.latitude), // Convert string back to number
      longitude: parseFloat(poi.longitude) // Convert string back to number
    };
  } catch (error) {
    console.error('POI creation failed:', error);
    throw error;
  }
};