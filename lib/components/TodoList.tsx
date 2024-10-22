import type { Todo } from '@/dbschema/interfaces'
import React, { useState } from 'react'
import { ReadTransaction, Replicache } from 'replicache'
import { useSubscribe } from 'replicache-react'
import { REPLICACHE_ID_PREFIXES } from '../ids'
import { M } from '../mutators'
import { TodoUpdate } from '../types'
import { DeleteIcon } from './DeleteIcon'

export async function listTodos(tx: ReadTransaction) {
  return (await tx
    .scan({ prefix: REPLICACHE_ID_PREFIXES.todo })
    .values()
    .toArray()) as unknown as Todo[]
}

const TodoList = ({ rep }: { rep: Replicache<M> }) => {
  const [newTask, setNewTask] = useState('')

  // Subscribe to all todos and sort them.
  const todos = useSubscribe(rep, listTodos, { default: [] })
  todos.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const handleNewItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newTask) {
      return
    }
    rep.mutate.createTodo({
      content: newTask,
      complete: false,
    })
    setNewTask('')
  }

  const handleUpdateTodo = (update: TodoUpdate) =>
    rep.mutate.updateTodo({ ...update, complete: !update.complete })

  const handleDeleteTodo = (replicache_id: string) => {
    void rep.mutate.deleteTodo({ replicache_id })
  }

  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-4 shadow-md">
      <h1 className="mb-4 text-2xl font-bold">To-Do List</h1>
      <form className="mb-4" onSubmit={handleNewItem}>
        <input
          type="text"
          placeholder="Add a new task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          className="hover:bg-primary-hover mt-2 rounded-md bg-black px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={!newTask}
        >
          Add Task
        </button>
      </form>
      <ul className="space-y-2">
        {todos.map((todo) => (
          <li
            key={todo.replicache_id}
            className="flex items-center justify-between rounded-md bg-gray-100 px-4 py-2"
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={todo.complete}
                onChange={() => handleUpdateTodo(todo)}
                className="mr-2 rounded-sm focus:ring-2 focus:ring-primary"
              />
              <span
                className={`text-gray-800 ${todo.complete ? 'text-gray-400 line-through' : ''}`}
              >
                {todo.content}
              </span>
            </div>
            <button
              onClick={() => handleDeleteTodo(todo.replicache_id)}
              className="text-red-500 hover:text-red-600"
            >
              <DeleteIcon className="h-5 w-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TodoList
