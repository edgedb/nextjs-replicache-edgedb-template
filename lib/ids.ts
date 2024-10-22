import { nanoid } from 'nanoid'

export const REPLICACHE_ID_PREFIXES = {
  todo: 'default::Todo',
} as const

type EdgedbObjectType =
  (typeof REPLICACHE_ID_PREFIXES)[keyof typeof REPLICACHE_ID_PREFIXES]

export function generate_replicache_id(type: EdgedbObjectType) {
  return `${type}/${nanoid()}`
}
