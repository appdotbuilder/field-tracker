import { db } from '../db';
import { poisTable } from '../db/schema';
import { type UpdatePoiInput, type PointOfInterest } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePoi = async (input: UpdatePoiInput): Promise<PointOfInterest> => {
  try {
    // Check if the POI exists
    const existingPoi = await db.select()
      .from(poisTable)
      .where(eq(poisTable.id, input.id))
      .execute();

    if (existingPoi.length === 0) {
      throw new Error(`POI with id ${input.id} not found`);
    }

    // Validate latitude and longitude coordinates if provided
    if (input.latitude !== undefined) {
      if (input.latitude < -90 || input.latitude > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }
    }

    if (input.longitude !== undefined) {
      if (input.longitude < -180 || input.longitude > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.latitude !== undefined) {
      updateData.latitude = input.latitude.toString(); // Convert to string for numeric column
    }

    if (input.longitude !== undefined) {
      updateData.longitude = input.longitude.toString(); // Convert to string for numeric column
    }

    if (input.poi_type !== undefined) {
      updateData.poi_type = input.poi_type;
    }

    // Update the POI
    const result = await db.update(poisTable)
      .set(updateData)
      .where(eq(poisTable.id, input.id))
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
    console.error('POI update failed:', error);
    throw error;
  }
};