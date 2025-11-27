import { getDatabase } from '../db';
import { NotFoundError, ValidationError } from '../types';

export interface AcceptanceCriterion {
  id: number;
  entity_type: 'epic' | 'task';
  entity_id: number;
  text: string;
  checked: boolean;
  checked_at: string | null;
  position: number;
  created_at: string;
}

export interface CreateCriterionInput {
  text: string;
  position?: number;
}

export interface UpdateCriterionInput {
  text?: string;
  checked?: boolean;
  position?: number;
}

/**
 * List acceptance criteria for an entity (epic or task)
 */
export function listCriteria(entityType: 'epic' | 'task', entityId: number): AcceptanceCriterion[] {
  const db = getDatabase();

  const rows = db
    .prepare(
      `
      SELECT id, entity_type, entity_id, text, checked, checked_at, position, created_at
      FROM acceptance_criteria
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY position ASC, id ASC
    `
    )
    .all(entityType, entityId) as Array<{
    id: number;
    entity_type: string;
    entity_id: number;
    text: string;
    checked: number;
    checked_at: string | null;
    position: number;
    created_at: string;
  }>;

  return rows.map((row) => ({
    ...row,
    entity_type: row.entity_type as 'epic' | 'task',
    checked: row.checked === 1,
  }));
}

/**
 * Get a single acceptance criterion by ID
 */
export function getCriterionById(id: number): AcceptanceCriterion | null {
  const db = getDatabase();

  const row = db
    .prepare(
      `
      SELECT id, entity_type, entity_id, text, checked, checked_at, position, created_at
      FROM acceptance_criteria
      WHERE id = ?
    `
    )
    .get(id) as
    | {
        id: number;
        entity_type: string;
        entity_id: number;
        text: string;
        checked: number;
        checked_at: string | null;
        position: number;
        created_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    ...row,
    entity_type: row.entity_type as 'epic' | 'task',
    checked: row.checked === 1,
  };
}

/**
 * Create a new acceptance criterion
 */
export function createCriterion(
  entityType: 'epic' | 'task',
  entityId: number,
  input: CreateCriterionInput
): AcceptanceCriterion {
  const db = getDatabase();

  if (!input.text || input.text.trim() === '') {
    throw new ValidationError('Criterion text is required');
  }

  // Get max position if not specified
  let position = input.position;
  if (position === undefined) {
    const maxPos = db
      .prepare(
        `
        SELECT MAX(position) as max_pos
        FROM acceptance_criteria
        WHERE entity_type = ? AND entity_id = ?
      `
      )
      .get(entityType, entityId) as { max_pos: number | null };

    position = (maxPos.max_pos ?? -1) + 1;
  }

  const result = db
    .prepare(
      `
      INSERT INTO acceptance_criteria (entity_type, entity_id, text, position)
      VALUES (?, ?, ?, ?)
    `
    )
    .run(entityType, entityId, input.text.trim(), position);

  return getCriterionById(result.lastInsertRowid as number)!;
}

/**
 * Update an acceptance criterion
 */
export function updateCriterion(id: number, input: UpdateCriterionInput): AcceptanceCriterion {
  const db = getDatabase();

  const criterion = getCriterionById(id);
  if (!criterion) {
    throw new NotFoundError('AcceptanceCriterion', id);
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.text !== undefined) {
    if (input.text.trim() === '') {
      throw new ValidationError('Criterion text cannot be empty');
    }
    updates.push('text = ?');
    values.push(input.text.trim());
  }

  if (input.checked !== undefined) {
    updates.push('checked = ?');
    values.push(input.checked ? 1 : 0);

    // Update checked_at timestamp
    if (input.checked) {
      updates.push('checked_at = CURRENT_TIMESTAMP');
    } else {
      updates.push('checked_at = NULL');
    }
  }

  if (input.position !== undefined) {
    updates.push('position = ?');
    values.push(input.position);
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE acceptance_criteria SET ${updates.join(', ')} WHERE id = ?`).run(
      ...values,
      id
    );
  }

  return getCriterionById(id)!;
}

/**
 * Delete an acceptance criterion
 */
export function deleteCriterion(id: number): void {
  const db = getDatabase();

  const criterion = getCriterionById(id);
  if (!criterion) {
    throw new NotFoundError('AcceptanceCriterion', id);
  }

  db.prepare('DELETE FROM acceptance_criteria WHERE id = ?').run(id);
}

/**
 * Bulk create acceptance criteria (useful for task creation with criteria)
 */
export function bulkCreateCriteria(
  entityType: 'epic' | 'task',
  entityId: number,
  criteria: Array<{ text: string; checked?: boolean }>
): AcceptanceCriterion[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO acceptance_criteria (entity_type, entity_id, text, checked, position)
    VALUES (?, ?, ?, ?, ?)
  `);

  const results: AcceptanceCriterion[] = [];

  const insertMany = db.transaction((items: typeof criteria) => {
    items.forEach((item, index) => {
      if (item.text && item.text.trim() !== '') {
        const result = stmt.run(
          entityType,
          entityId,
          item.text.trim(),
          item.checked ? 1 : 0,
          index
        );
        const criterion = getCriterionById(result.lastInsertRowid as number);
        if (criterion) {
          results.push(criterion);
        }
      }
    });
  });

  insertMany(criteria);

  return results;
}

/**
 * Delete all criteria for an entity (useful when deleting epic/task)
 */
export function deleteAllCriteria(entityType: 'epic' | 'task', entityId: number): number {
  const db = getDatabase();

  const result = db
    .prepare('DELETE FROM acceptance_criteria WHERE entity_type = ? AND entity_id = ?')
    .run(entityType, entityId);

  return result.changes;
}

/**
 * Reorder criteria within an entity
 */
export function reorderCriteria(
  entityType: 'epic' | 'task',
  entityId: number,
  criterionIds: number[]
): AcceptanceCriterion[] {
  const db = getDatabase();

  const updatePos = db.prepare(
    'UPDATE acceptance_criteria SET position = ? WHERE id = ? AND entity_type = ? AND entity_id = ?'
  );

  const reorder = db.transaction(() => {
    criterionIds.forEach((id, index) => {
      updatePos.run(index, id, entityType, entityId);
    });
  });

  reorder();

  return listCriteria(entityType, entityId);
}

/**
 * Get completion stats for an entity's criteria
 */
export function getCriteriaStats(
  entityType: 'epic' | 'task',
  entityId: number
): { total: number; checked: number; percentage: number } {
  const db = getDatabase();

  const stats = db
    .prepare(
      `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN checked = 1 THEN 1 ELSE 0 END) as checked
      FROM acceptance_criteria
      WHERE entity_type = ? AND entity_id = ?
    `
    )
    .get(entityType, entityId) as { total: number; checked: number };

  const total = stats.total || 0;
  const checked = stats.checked || 0;
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

  return { total, checked, percentage };
}
