import { db } from '../db';
import { zoneAssignmentsTable } from '../db/schema';
import { type CompleteZoneInput, type ZoneAssignment } from '../schema';
import { eq } from 'drizzle-orm';

export const completeZone = async (input: CompleteZoneInput): Promise<ZoneAssignment> => {
  try {
    // First verify the assignment exists
    const existingAssignment = await db.select()
      .from(zoneAssignmentsTable)
      .where(eq(zoneAssignmentsTable.id, input.assignment_id))
      .execute();

    if (existingAssignment.length === 0) {
      throw new Error('Zone assignment not found');
    }

    const assignment = existingAssignment[0];

    // Check if already completed
    if (assignment.status === 'completed') {
      throw new Error('Zone assignment is already completed');
    }

    // Update the assignment to completed status with current timestamp
    const result = await db.update(zoneAssignmentsTable)
      .set({
        status: 'completed',
        completed_at: new Date()
      })
      .where(eq(zoneAssignmentsTable.id, input.assignment_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Zone completion failed:', error);
    throw error;
  }
};