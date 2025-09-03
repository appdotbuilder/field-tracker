import { db } from '../db';
import { zoneAssignmentsTable } from '../db/schema';
import { type UpdateProgressInput, type ZoneAssignment } from '../schema';
import { eq } from 'drizzle-orm';

export const updateProgress = async (input: UpdateProgressInput): Promise<ZoneAssignment> => {
  try {
    // First, verify the assignment exists
    const existingAssignment = await db.select()
      .from(zoneAssignmentsTable)
      .where(eq(zoneAssignmentsTable.id, input.assignment_id))
      .execute();

    if (existingAssignment.length === 0) {
      throw new Error('Zone assignment not found');
    }

    // Update the assignment with new progress
    // Automatically set status to 'in_progress' if currently 'assigned'
    const currentStatus = existingAssignment[0].status;
    const newStatus = currentStatus === 'assigned' ? 'in_progress' : currentStatus;

    const result = await db.update(zoneAssignmentsTable)
      .set({
        progress_houses: input.progress_houses,
        status: newStatus
      })
      .where(eq(zoneAssignmentsTable.id, input.assignment_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Progress update failed:', error);
    throw error;
  }
};