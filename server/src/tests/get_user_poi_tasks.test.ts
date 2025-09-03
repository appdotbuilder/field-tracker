import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, poisTable, poiTasksTable } from '../db/schema';
import { getUserPoiTasks, type PoiTaskWithPoi } from '../handlers/get_user_poi_tasks';
import { eq } from 'drizzle-orm';

describe('getUserPoiTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return POI tasks for a specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create another user to test isolation
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'otheruser@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    
    const otherUserId = otherUserResult[0].id;

    // Create test POIs
    const poiResults = await db.insert(poisTable)
      .values([
        {
          name: 'Billboard Location 1',
          description: 'Main street billboard',
          latitude: '40.12345678'.toString(),
          longitude: '-74.98765432'.toString(),
          poi_type: 'billboard',
          created_by: userId
        },
        {
          name: 'Wall Location 1',
          description: 'Shopping center wall',
          latitude: '40.23456789'.toString(),
          longitude: '-74.87654321'.toString(),
          poi_type: 'wall',
          created_by: userId
        }
      ])
      .returning()
      .execute();

    const poi1Id = poiResults[0].id;
    const poi2Id = poiResults[1].id;

    // Create POI tasks for the test user
    await db.insert(poiTasksTable)
      .values([
        {
          poi_id: poi1Id,
          user_id: userId,
          status: 'assigned'
        },
        {
          poi_id: poi2Id,
          user_id: userId,
          status: 'completed',
          completed_at: new Date()
        }
      ])
      .execute();

    // Create task for other user to ensure isolation
    await db.insert(poiTasksTable)
      .values({
        poi_id: poi1Id,
        user_id: otherUserId,
        status: 'assigned'
      })
      .execute();

    // Test the handler
    const tasks = await getUserPoiTasks(userId);

    // Should return only tasks for the specified user
    expect(tasks).toHaveLength(2);

    // Verify first task
    const assignedTask = tasks.find(t => t.status === 'assigned');
    expect(assignedTask).toBeDefined();
    expect(assignedTask!.user_id).toBe(userId);
    expect(assignedTask!.poi_id).toBe(poi1Id);
    expect(assignedTask!.status).toBe('assigned');
    expect(assignedTask!.assigned_at).toBeInstanceOf(Date);
    expect(assignedTask!.completed_at).toBeNull();

    // Verify POI information is included
    expect(assignedTask!.poi.name).toBe('Billboard Location 1');
    expect(assignedTask!.poi.description).toBe('Main street billboard');
    expect(assignedTask!.poi.latitude).toBe(40.12345678);
    expect(assignedTask!.poi.longitude).toBe(-74.98765432);
    expect(assignedTask!.poi.poi_type).toBe('billboard');
    expect(typeof assignedTask!.poi.latitude).toBe('number');
    expect(typeof assignedTask!.poi.longitude).toBe('number');

    // Verify second task
    const completedTask = tasks.find(t => t.status === 'completed');
    expect(completedTask).toBeDefined();
    expect(completedTask!.user_id).toBe(userId);
    expect(completedTask!.poi_id).toBe(poi2Id);
    expect(completedTask!.status).toBe('completed');
    expect(completedTask!.completed_at).toBeInstanceOf(Date);

    // Verify POI information for completed task
    expect(completedTask!.poi.name).toBe('Wall Location 1');
    expect(completedTask!.poi.poi_type).toBe('wall');
    expect(completedTask!.poi.latitude).toBe(40.23456789);
    expect(completedTask!.poi.longitude).toBe(-74.87654321);
  });

  it('should return empty array when user has no POI tasks', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test with user that has no tasks
    const tasks = await getUserPoiTasks(userId);

    expect(tasks).toHaveLength(0);
  });

  it('should return tasks with correct POI information structure', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashedpassword',
        role: 'admin'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test POI with null description
    const poiResult = await db.insert(poisTable)
      .values({
        name: 'Other Location',
        description: null, // Test nullable field
        latitude: '41.00000000'.toString(),
        longitude: '-75.00000000'.toString(),
        poi_type: 'other',
        created_by: userId
      })
      .returning()
      .execute();

    const poiId = poiResult[0].id;

    // Create POI task
    await db.insert(poiTasksTable)
      .values({
        poi_id: poiId,
        user_id: userId,
        status: 'assigned'
      })
      .execute();

    // Test the handler
    const tasks = await getUserPoiTasks(userId);

    expect(tasks).toHaveLength(1);
    
    const task = tasks[0];
    
    // Verify task structure
    expect(task.id).toBeDefined();
    expect(task.poi_id).toBe(poiId);
    expect(task.user_id).toBe(userId);
    expect(task.status).toBe('assigned');
    expect(task.assigned_at).toBeInstanceOf(Date);
    expect(task.completed_at).toBeNull();

    // Verify POI structure with nullable description
    expect(task.poi).toBeDefined();
    expect(task.poi.id).toBe(poiId);
    expect(task.poi.name).toBe('Other Location');
    expect(task.poi.description).toBeNull();
    expect(task.poi.latitude).toBe(41.00000000);
    expect(task.poi.longitude).toBe(-75.00000000);
    expect(task.poi.poi_type).toBe('other');
    expect(task.poi.created_by).toBe(userId);
    expect(task.poi.created_at).toBeInstanceOf(Date);
    expect(task.poi.updated_at).toBeInstanceOf(Date);
  });

  it('should save task correctly in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test POI
    const poiResult = await db.insert(poisTable)
      .values({
        name: 'Test Billboard',
        description: 'Test location',
        latitude: '40.12345678'.toString(),
        longitude: '-74.98765432'.toString(),
        poi_type: 'billboard',
        created_by: userId
      })
      .returning()
      .execute();

    const poiId = poiResult[0].id;

    // Create POI task
    const taskResult = await db.insert(poiTasksTable)
      .values({
        poi_id: poiId,
        user_id: userId,
        status: 'assigned'
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Verify task exists in database
    const dbTasks = await db.select()
      .from(poiTasksTable)
      .where(eq(poiTasksTable.id, taskId))
      .execute();

    expect(dbTasks).toHaveLength(1);
    expect(dbTasks[0].poi_id).toBe(poiId);
    expect(dbTasks[0].user_id).toBe(userId);
    expect(dbTasks[0].status).toBe('assigned');
    expect(dbTasks[0].assigned_at).toBeInstanceOf(Date);

    // Test handler returns the same data
    const tasks = await getUserPoiTasks(userId);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(taskId);
  });
});