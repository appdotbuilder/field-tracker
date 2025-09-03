import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, poisTable, poiTasksTable } from '../db/schema';
import { type CompletePoiTaskInput } from '../schema';
import { completePoiTask } from '../handlers/complete_poi_task';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CompletePoiTaskInput = {
  task_id: 1
};

describe('completePoiTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should complete a POI task', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    // Create prerequisite POI
    const poi = await db.insert(poisTable)
      .values({
        name: 'Test Billboard',
        description: 'A test billboard location',
        latitude: '40.7128', // Convert number to string for numeric column
        longitude: '-74.0060',
        poi_type: 'billboard',
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create POI task
    const task = await db.insert(poiTasksTable)
      .values({
        poi_id: poi[0].id,
        user_id: user[0].id,
        status: 'assigned'
      })
      .returning()
      .execute();

    const result = await completePoiTask({ task_id: task[0].id });

    // Verify the task is completed
    expect(result.id).toEqual(task[0].id);
    expect(result.poi_id).toEqual(poi[0].id);
    expect(result.user_id).toEqual(user[0].id);
    expect(result.status).toEqual('completed');
    expect(result.assigned_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at).not.toBeNull();
  });

  it('should save completed status to database', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    // Create prerequisite POI
    const poi = await db.insert(poisTable)
      .values({
        name: 'Test Wall',
        description: 'A test wall location',
        latitude: '40.7580', // Convert number to string for numeric column
        longitude: '-73.9855',
        poi_type: 'wall',
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create POI task
    const task = await db.insert(poiTasksTable)
      .values({
        poi_id: poi[0].id,
        user_id: user[0].id,
        status: 'assigned'
      })
      .returning()
      .execute();

    const result = await completePoiTask({ task_id: task[0].id });

    // Query database to verify the update
    const tasks = await db.select()
      .from(poiTasksTable)
      .where(eq(poiTasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toEqual('completed');
    expect(tasks[0].completed_at).toBeInstanceOf(Date);
    expect(tasks[0].completed_at).not.toBeNull();
  });

  it('should throw error when task does not exist', async () => {
    const nonExistentTaskId = 999;

    await expect(completePoiTask({ task_id: nonExistentTaskId }))
      .rejects.toThrow(/POI task with ID 999 not found/i);
  });

  it('should complete already completed task idempotently', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create prerequisite POI
    const poi = await db.insert(poisTable)
      .values({
        name: 'Test Other Location',
        description: null,
        latitude: '40.7589', // Convert number to string for numeric column
        longitude: '-73.9851',
        poi_type: 'other',
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create already completed POI task
    const completedDate = new Date('2023-01-01T10:00:00Z');
    const task = await db.insert(poiTasksTable)
      .values({
        poi_id: poi[0].id,
        user_id: user[0].id,
        status: 'completed',
        completed_at: completedDate
      })
      .returning()
      .execute();

    const result = await completePoiTask({ task_id: task[0].id });

    // Should successfully complete again (idempotent operation)
    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    // The completed_at timestamp should be updated to current time
    expect(result.completed_at).not.toEqual(completedDate);
  });
});