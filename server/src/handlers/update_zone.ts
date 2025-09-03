import { db } from '../db';
import { zonesTable, usersTable } from '../db/schema';
import { type UpdateZoneInput, type Zone } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateZone(input: UpdateZoneInput): Promise<Zone> {
  try {
    // Validate that the zone exists
    const existingZone = await db.select()
      .from(zonesTable)
      .where(eq(zonesTable.id, input.id))
      .execute();

    if (existingZone.length === 0) {
      throw new Error(`Zone with id ${input.id} not found`);
    }

    // Validate GeoJSON geometry format if provided
    if (input.geometry) {
      try {
        const parsed = JSON.parse(input.geometry);
        if (!parsed.type || parsed.type !== 'Polygon' || !parsed.coordinates) {
          throw new Error('Invalid GeoJSON format - must be a Polygon');
        }
        if (!Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) {
          throw new Error('Invalid GeoJSON coordinates');
        }
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error('Invalid JSON format for geometry');
        }
        throw parseError;
      }
    }

    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.geometry !== undefined) {
      updateData.geometry = input.geometry;
    }
    if (input.estimated_houses !== undefined) {
      updateData.estimated_houses = input.estimated_houses;
    }

    // Update the zone
    const result = await db.update(zonesTable)
      .set(updateData)
      .where(eq(zonesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Zone update failed:', error);
    throw error;
  }
}