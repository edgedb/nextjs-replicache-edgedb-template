import { nanoid } from "nanoid";
import React, { useState } from "react";
import { ReadTransaction, Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { M } from "../mutators";
import { Todo, Update } from "../types";
import { DeleteIcon } from "./DeleteIcon";

export async function listTodos(tx: ReadTransaction) {
  return await tx.scan<Todo>().values().toArray();
}

const TodoList = ({ rep }: { rep: Replicache<M> }) => {
  const [newTask, setNewTask] = useState("")

  // Subscribe to all todos and sort them.
  const todos = useSubscribe(rep, listTodos, { default: [] });
  todos.sort((a, b) => a.createdAt - b.createdAt);

  const handleNewItem = () => {
    if (!newTask) {
      return;
    }
    rep.mutate.createTodo({
      todoID: nanoid(),
      content: newTask,
      complete: false,
      createdAt: Date.now(),
    });
  }

  const handleUpdateTodo = (update: Update) =>
    rep.mutate.updateTodo({ ...update, complete: !update.complete });

  const handleDeleteTodo = (id: string) => {
    void rep.mutate.deleteTodo(id);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">To-Do List</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Add a new task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button onClick={handleNewItem} className="mt-2 bg-black font-semibold text-white px-4 py-2 rounded-md hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={!newTask}
        >
          Add Task
        </button>
      </div>
      <ul className="space-y-2">
        {todos.map((todo) => (
          <li key={todo.todoID} className="flex items-center justify-between px-4 py-2 bg-gray-100 rounded-md">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={todo.complete}
                onChange={() => handleUpdateTodo(todo)}
                className="mr-2 rounded-sm focus:ring-2 focus:ring-primary"
              />
              <span className={`text-gray-800 ${todo.complete ? "line-through text-gray-400" : ""}`}>
                {todo.content}
              </span>
            </div>
            <button onClick={() => handleDeleteTodo(todo.todoID)} className="text-red-500 hover:text-red-600">
              <DeleteIcon className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;
