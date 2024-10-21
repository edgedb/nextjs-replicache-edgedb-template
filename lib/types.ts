import type { Todo } from '@/dbschema/interfaces'

export const isTodo = (obj: any): obj is Todo => {
  return 'replicache_id' in obj && 'content' in obj && 'complete' in obj
}

export interface TodoUpdate {
  readonly replicache_id: string
  readonly complete: boolean
}
