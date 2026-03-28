/**
 * Tests for ExerciseService.createWeeklyExercise validation logic.
 * Covers input validation, puzzle ID format, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database dependencies before importing ExerciseService
vi.mock('../src/database/SqliteDatabase.js', () => ({
  database: {
    run: vi.fn(() => ({ changes: 1 })),
    query: vi.fn(() => []),
    queryOne: vi.fn(() => null)
  }
}))

vi.mock('../src/exercises/ExerciseRepository.js', () => {
  const repo = {
    generateExerciseId: () => 'test_id_123',
    createExercise: vi.fn(() => ({
      success: true,
      data: { id: 'test_id_123', week_start: '2026-03-23', week_end: '2026-03-29' }
    }))
  }
  return { exerciseRepository: repo, ExerciseRepository: function() { return repo } }
})

vi.mock('../src/students/StudentRepository.js', () => ({
  studentRepository: {}
}))

const { ExerciseService } = await import('../src/exercises/ExerciseService.js')
const { exerciseRepository } = await import('../src/exercises/ExerciseRepository.js')

describe('ExerciseService.createWeeklyExercise', () => {
  let service

  beforeEach(() => {
    service = new ExerciseService()
    vi.clearAllMocks()
  })

  it('rejects empty puzzleIds', () => {
    const result = service.createWeeklyExercise({ puzzleIds: [] })
    expect(result.success).toBe(false)
    expect(result.error).toContain('At least one puzzle')
  })

  it('rejects null puzzleIds', () => {
    const result = service.createWeeklyExercise({ puzzleIds: null })
    expect(result.success).toBe(false)
  })

  it('rejects non-array puzzleIds', () => {
    const result = service.createWeeklyExercise({ puzzleIds: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid puzzle ID format (spaces)', () => {
    const result = service.createWeeklyExercise({ puzzleIds: ['valid_id', 'invalid id'] })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid puzzle ID format')
  })

  it('rejects puzzle IDs with special characters', () => {
    const result = service.createWeeklyExercise({ puzzleIds: ['abc<script>'] })
    expect(result.success).toBe(false)
  })

  it('accepts valid alphanumeric puzzle IDs', () => {
    exerciseRepository.createExercise.mockReturnValue({
      success: true,
      data: { id: 'test_id_123' }
    })

    const result = service.createWeeklyExercise({
      puzzleIds: ['abc123', 'def-456', 'ghi_789'],
      weekStart: '2026-03-23'
    })
    expect(result.success).toBe(true)
  })

  it('passes correct data to repository', () => {
    exerciseRepository.createExercise.mockReturnValue({
      success: true,
      data: { id: 'test_id_123' }
    })

    service.createWeeklyExercise({
      puzzleIds: ['p1', 'p2'],
      name: 'Test Exercise',
      weekStart: '2026-03-23',
      filters: { count: 2 }
    })

    expect(exerciseRepository.createExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        week_start: '2026-03-23',
        week_end: '2026-03-29',
        name: 'Test Exercise',
        puzzle_ids: 'p1,p2'
      })
    )
  })

  it('generates default name when none provided', () => {
    exerciseRepository.createExercise.mockReturnValue({
      success: true,
      data: { id: 'test_id_123' }
    })

    service.createWeeklyExercise({
      puzzleIds: ['p1'],
      weekStart: '2026-03-23'
    })

    const call = exerciseRepository.createExercise.mock.calls[0][0]
    expect(call.name).toContain('Mar')
  })
})
