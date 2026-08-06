// import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { Extension } from "@girs/gnome-shell/extensions/extension";
import { isEmpty } from "./utils.js";
import Gio from "gi://Gio";

const TODOS = "todos";

export class TodoListManager {
  GSettings: Gio.Settings;

  constructor(extension: Extension) {
    this.GSettings = extension.getSettings();
  }

  get() {
    // retrieves todos as an array of strings
    return this.GSettings.get_strv(TODOS);
  }

  getTotalUndone() {
    // retrieves todos as an array of strings
    const todos = this.get();
    if (!todos.length) {
      return 0;
    }

    return todos.reduce((total, todo) => {
      const parsedTodo: Task = JSON.parse(todo);
      return total + (!parsedTodo.isDone ? 1 : 0);
    }, 0);
  }

  add(task: string) {
    const todos = this.get();
    todos.push(JSON.stringify({ name: task, isDone: false }));
    this.GSettings.set_strv(TODOS, todos);
  }

  remove(index: number) {
    const todos = this.get();
    if (isEmpty(todos)) {
      return;
    }
    todos.splice(index, 1);
    this.GSettings.set_strv(TODOS, todos);
  }

  update(index: number, todo: Task) {
    const todos = this.get();
    if (isEmpty(todos)) {
      return;
    }
    if (todo.isFocused && index > 0) {
      // focus should only be on a single field
      // i don't want to update all the other ones isFocused to false
      // it's just not good, to know if it's focus just check if index === 0 and isFocused = true
      // we will move it to the top
      const tmp = todos[0];
      todos[0] = JSON.stringify(todo, null, 2);
      todos[index] = tmp;
    } else {
      todos[index] = JSON.stringify(todo, null, 2);
    }
    this.GSettings.set_strv(TODOS, todos);
  }

  /**
   * Move a todo from one index to another, persisting array order to GSettings.
   */
  reorder(fromIndex: number, toIndex: number) {
    const todos = this.get();
    if (isEmpty(todos)) {
      return;
    }
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= todos.length ||
      toIndex >= todos.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const [item] = todos.splice(fromIndex, 1);
    todos.splice(toIndex, 0, item);
    this.GSettings.set_strv(TODOS, todos);
  }
}

export interface Task {
  name: string;
  isDone: boolean;
  isFocused?: boolean;
}
