import { db } from '../db';
import { usersTable, zonesTable, zoneAssignmentsTable } from '../db/schema';
import { type AssignZoneInput, type ZoneAssignment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const assignZone = async (input: AssignZoneInput): Promise<ZoneAssignment> => {
  try {
    // Validate that the zone exists
    const zone = await db.select()
      .from(zonesTable)
      .where(eq(zonesTable.id, input.zone_id))
      .execute();

    if (zone.length === 0) {
      throw new Error(`Zone with id ${input.zone_id} not found`);
    }

    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Check if the zone is already assigned to any user
    const existingAssignment = await db.select()
      .from(zoneAssignmentsTable)
      .where(
        and(
          eq(zoneAssignmentsTable.zone_id, input.zone_id),
          eq(zoneAssignmentsTable.status, 'assigned')
        )
      )
      .execute();

    if (existingAssignment.length > 0) {
      throw new Error(`Zone ${input.zone_id} is already assigned to another user`);
    }

    // Check for in-progress assignments
    const inProgressAssignment = await db.select()
      .from(zoneAssignmentsTable)
      .where(
        and(
          eq(zoneAssignmentsTable.zone_id, input.zone_id),
          eq(zoneAssignmentsTable.status, 'in_progress')
        )
      )
      .execute();

    if (inProgressAssignment.length > 0) {
      throw new Error(`Zone ${input.zone_id} is currently in progress by another user`);
    }

    // Create the zone assignment
    const result = await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: input.zone_id,
        user_id: input.user_id,
        status: 'assigned',
        progress_houses: 0
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Zone assignment failed:', error);
    throw error;
  }
};