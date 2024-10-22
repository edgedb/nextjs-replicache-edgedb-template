import type { Todo } from '@/dbschema/interfaces'
import { WriteTransaction, type ReadonlyJSONObject } from 'replicache'
import { generate_replicache_id, REPLICACHE_ID_PREFIXES } from './ids'
import { TodoUpdate } from './types'

export type M = typeof mutators

export const mutators = {
  updateTodo: async (tx: WriteTransaction, update: TodoUpdate) => {
    const prev = (await tx.get(update.replicache_id)) as unknown as Todo
    const next = {
      ...prev,
      ...update,
      complete: update.complete,
    } satisfies Todo
    await tx.set(next.replicache_id, next as unknown as ReadonlyJSONObject)
  },

  deleteTodo: async (
    tx: WriteTransaction,
    { replicache_id }: { replicache_id: string },
  ) => {
    await tx.del(replicache_id)
  },

  createTodo: async (
    tx: WriteTransaction,
    todo: Pick<Todo, 'complete' | 'content'>,
  ) => {
    const replicache_id = generate_replicache_id(REPLICACHE_ID_PREFIXES.todo)
    await tx.set(replicache_id, {
      ...todo,
      replicache_id: replicache_id,
      created_at: new Date().toISOString(),
    })
  },
}
