import { db } from '../db';
import { zoneAssignmentsTable, zonesTable } from '../db/schema';
import { type ZoneAssignment } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserAssignments(userId: number): Promise<ZoneAssignment[]> {
  try {
    // Query zone assignments with zone information joined
    const results = await db.select()
      .from(zoneAssignmentsTable)
      .innerJoin(zonesTable, eq(zoneAssignmentsTable.zone_id, zonesTable.id))
      .where(eq(zoneAssignmentsTable.user_id, userId))
      .execute();

    // Map results to ZoneAssignment objects
    return results.map(result => ({
      id: result.zone_assignments.id,
      zone_id: result.zone_assignments.zone_id,
      user_id: result.zone_assignments.user_id,
      status: result.zone_assignments.status,
      progress_houses: result.zone_assignments.progress_houses,
      assigned_at: result.zone_assignments.assigned_at,
      completed_at: result.zone_assignments.completed_at
    }));
  } catch (error) {
    console.error('Failed to fetch user assignments:', error);
    throw error;
  }
}