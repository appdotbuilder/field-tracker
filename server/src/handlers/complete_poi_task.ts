import { db } from '../db';
import { poiTasksTable } from '../db/schema';
import { type CompletePoiTaskInput, type PoiTask } from '../schema';
import { eq } from 'drizzle-orm';

export const completePoiTask = async (input: CompletePoiTaskInput): Promise<PoiTask> => {
  try {
    // Update the task status to 'completed' and set completed_at timestamp
    const result = await db.update(poiTasksTable)
      .set({
        status: 'completed',
        completed_at: new Date()
      })
      .where(eq(poiTasksTable.id, input.task_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`POI task with ID ${input.task_id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('POI task completion failed:', error);
    throw error;
  }
};