/**
 * param-adapter.test.js
 * Unit tests for the ?→$N SQL parameter adapter.
 */

import { describe, it, expect } from 'vitest';
import { adaptParams } from '../../src/database/drivers/param-adapter.js';

describe('adaptParams', () => {
  it('returns sql unchanged when no ? present', () => {
    const sql = 'SELECT 1';
    const { sql: out, count } = adaptParams(sql);
    expect(out).toBe('SELECT 1');
    expect(count).toBe(0);
  });

  it('replaces single ?', () => {
    const { sql, count } = adaptParams('SELECT * FROM t WHERE id = ?');
    expect(sql).toBe('SELECT * FROM t WHERE id = $1');
    expect(count).toBe(1);
  });

  it('replaces multiple ? in order', () => {
    const { sql, count } = adaptParams('SELECT * FROM t WHERE a = ? AND b = ?');
    expect(sql).toBe('SELECT * FROM t WHERE a = $1 AND b = $2');
    expect(count).toBe(2);
  });

  it('does not replace ? inside single-quoted string', () => {
    const { sql, count } = adaptParams("SELECT * FROM t WHERE note = 'has?mark' AND id = ?");
    expect(sql).toBe("SELECT * FROM t WHERE note = 'has?mark' AND id = $1");
    expect(count).toBe(1);
  });

  it('handles escaped single quote \'\' inside string', () => {
    // SQL: WHERE note = 'it''s fine?' AND id = ?
    const input = "SELECT * FROM t WHERE note = 'it''s fine?' AND id = ?";
    const { sql, count } = adaptParams(input);
    // The ? inside the string (after escaped '') stays literal
    expect(sql).toBe("SELECT * FROM t WHERE note = 'it''s fine?' AND id = $1");
    expect(count).toBe(1);
  });

  it('handles multiple string literals interleaved with params', () => {
    const input = "INSERT INTO t (a, b, c) VALUES (?, 'literal?', ?)";
    const { sql, count } = adaptParams(input);
    expect(sql).toBe("INSERT INTO t (a, b, c) VALUES ($1, 'literal?', $2)");
    expect(count).toBe(2);
  });

  it('handles empty string input', () => {
    const { sql, count } = adaptParams('');
    expect(sql).toBe('');
    expect(count).toBe(0);
  });

  it('handles consecutive params', () => {
    const { sql, count } = adaptParams('SELECT ?, ?, ?');
    expect(sql).toBe('SELECT $1, $2, $3');
    expect(count).toBe(3);
  });

  it('handles ? immediately after string closes', () => {
    const input = "SELECT 'done'=? FROM t";
    const { sql, count } = adaptParams(input);
    expect(sql).toBe("SELECT 'done'=$1 FROM t");
    expect(count).toBe(1);
  });
});
