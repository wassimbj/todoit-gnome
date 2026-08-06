"use strict";
import Clutter from "gi://Clutter";
import St from "gi://St";
import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as DND from "resource:///org/gnome/shell/ui/dnd.js";
import { Task, TodoListManager } from "./manager.js";
import { isEmpty } from "./utils.js";
import Meta from "gi://Meta";
import Shell from "gi://Shell";

const MAX_WINDOW_WIDTH = 500;
const MAX_INPUT_CHARS = 200;
const buttonIcon = (total: number) => _(`(✔${total})`);

/** Delegate attached to each todo row for Shell DND reordering */
interface TodoItemDelegate {
  isTodoItem: true;
  index: number;
  actor: Clutter.Actor;
  getDragActor: () => Clutter.Actor;
  getDragActorSource: () => Clutter.Actor;
  handleDragOver: (
    source: TodoItemDelegate,
    _actor: Clutter.Actor,
    _x: number,
    y: number,
    _time: number
  ) => number;
  acceptDrop: (
    source: TodoItemDelegate,
    _actor: Clutter.Actor,
    _x: number,
    y: number,
    _time: number
  ) => boolean;
}

export default class TodoListExtension extends Extension {
  _indicator?: PanelMenu.Button | null;
  _manager!: TodoListManager | null;
  mainBox?: St.BoxLayout | null;
  todosBox!: St.BoxLayout | null;
  buttonText!: St.Label | null;
  input?: St.Entry | null;
  button!: PanelMenu.Button | null;
  _dragOverItem: PopupMenu.PopupMenuItem | null = null;
  /** Rebuild list after DND finishes (avoid destroying actors mid-drop) */
  _pendingRepopulate = false;

  enable() {
    this.button = new PanelMenu.Button(0.0, this.metadata.name, false);
    this._manager = new TodoListManager(this);
    const totalTodos = this._manager.getTotalUndone();

    this.buttonText = new St.Label({
      text: buttonIcon(totalTodos),
      y_align: Clutter.ActorAlign.CENTER,
    });
    this.buttonText.set_style("text-align:center;");
    this.button.add_child(this.buttonText);
    this._indicator = this.button;
    Main.panel.addToStatusArea(this.uuid, this._indicator);
    // Create a PopupMenu for the button
    this._buildPopupMenu();
    this._populate();
    this._toggleShortcut();
  }

  _buildPopupMenu() {
    // Destroy previous box
    if (this.mainBox != undefined) {
      this.mainBox.destroy();
    }

    // Create main box
    this.mainBox = new St.BoxLayout({ vertical: true });

    // Create todos box
    this.todosBox = new St.BoxLayout({ vertical: true });
    // Create todos scrollview
    var scrollView = new St.ScrollView({
      style_class: "vfade",
    });
    scrollView.add_child(this.todosBox);
    // Separator
    var separator = new PopupMenu.PopupSeparatorMenuItem();

    // Text entry
    this.input = new St.Entry({
      name: "newTaskEntry",
      hint_text: _("New task..."),
      track_hover: true,
      can_focus: true,
      styleClass: "input",
    });

    // this.input.set_style("max-width: ${MAX_WINDOW_WIDTH};");
    this.input.clutterText.connect("activate", (source) => {
      let taskText = source.get_text().trim();
      if (taskText) {
        this._addTask(taskText);
        source.set_text("");
        source.grab_key_focus();
      }
    });
    this.input.clutterText.set_max_length(MAX_INPUT_CHARS);

    // Bottom section
    var bottomSection = new PopupMenu.PopupMenuSection();
    bottomSection.actor.add_child(this.input);

    this.mainBox.add_child(scrollView);
    this.mainBox.add_child(separator);
    this.mainBox.set_style(`width: ${MAX_WINDOW_WIDTH}px; max-height: 500px;`);
    this.mainBox.add_child(bottomSection.actor);

    (this.button?.menu as PopupMenu.PopupMenu).box.add_child(this.mainBox);
  }

  _populate() {
    // clear the todos box before populating it
    this.todosBox?.destroy_all_children();

    const todos = this._manager?.get();
    if (isEmpty(todos)) {
      let item = new St.Label({
        text: _("✅ Nothing to do for now"),
        y_align: Clutter.ActorAlign.CENTER,
        style: "text-align:center; font-size: 20px; padding: 20px 0;",
      });
      this.todosBox?.add_child(item);
    } else {
      let i = 0;
      for (const task of todos!) {
        const parsedTask = JSON.parse(task);
        this._addTodoItem(parsedTask, i);
        i = i + 1;
      }
    }
  }

  _addTask(task: string) {
    this._manager?.add(task);
    this._populate();
    this._refreshTodosButtonText();
  }

  _addTodoItem(task: Task, index: number) {
    const isFocused = index === 0 && task.isFocused;
    // Create a new PopupMenuItem for the task
    let item = new PopupMenu.PopupMenuItem("");
    item.style_class = `item ${isFocused ? "focused-task" : ""}`;
    // Fill the menu width so the drag handle sits on the extreme right for every row
    (item as unknown as Clutter.Actor).x_expand = true;

    // Create a horizontal box layout for custom alignment
    let box = new St.BoxLayout({
      style_class: "todo-item-layout", // You can add a custom class here
      vertical: false,
      x_expand: true,
      x_align: Clutter.ActorAlign.FILL,
    });

    // Checkbox button
    const toggleBtnLabel = new St.Label({
      text: task.isDone ? "✔" : "",
    });
    const toggleCompletionBtn = new St.Button({
      style_class: "toggle-completion-btn",
      y_align: Clutter.ActorAlign.CENTER,
      child: toggleBtnLabel,
    });

    toggleCompletionBtn.connect("clicked", () => {
      this._manager?.update(index, { ...task, isDone: !task.isDone });
      const willBeDone = !task.isDone;
      if (willBeDone) {
        // toggler, so we are going to add the done icon
        toggleBtnLabel.set_text("✔");
      } else {
        toggleBtnLabel.set_text("");
      }
      this._populate();
      this._refreshTodosButtonText();
    });

    box.add_child(toggleCompletionBtn);

    // Task label — expands so action buttons + drag handle stay on the right edge
    const label = new St.Label({
      text: task.name,
      y_align: Clutter.ActorAlign.CENTER,
      style_class: "task-label",
      x_expand: true,
      x_align: Clutter.ActorAlign.START,
    });
    label.clutterText.line_wrap = true;
    label.clutterText.set_ellipsize(0);

    if (task.isDone) {
      // cross line
      label.clutterText.set_markup(`<s>${task.name}</s>`);
      label.set_style("color: #999");
    }

    // Copty button
    const copyButton = new St.Button({
      child: new St.Icon({
        icon_name: "edit-copy-symbolic",
        style_class: "btn-icon",
      }),
      style_class: "copy-btn",
      y_align: Clutter.ActorAlign.CENTER,
      x_align: Clutter.ActorAlign.END,
    });
    copyButton.connect("clicked", () => {
      // Access the clipboard
      let clipboard = St.Clipboard.get_default();
      clipboard.set_text(St.ClipboardType.CLIPBOARD, task.name); // Copy to clipboard
      // Optionally show a notification
      Main.notify("Copied to clipboard", task.name);
      return Clutter.EVENT_STOP; // Stop propagation of the event
    });

    // Remove button
    const removeButton = new St.Button({
      child: new St.Icon({
        icon_name: "edit-delete-symbolic",
        style_class: "remove-icon btn-icon",
      }),
      style_class: "remove-btn",
      y_align: Clutter.ActorAlign.CENTER,
      x_align: Clutter.ActorAlign.END,
    });

    // Connect the button click event
    removeButton.connect("clicked", () => {
      this._manager?.remove(index);
      this._populate();
      this._refreshTodosButtonText();
    });

    // Focus button
    const focusButton = new St.Button({
      child: new St.Icon({
        icon_name: "find-location-symbolic",
        style_class: "focus-icon btn-icon",
      }),
      style_class: "focus-btn",
      y_align: Clutter.ActorAlign.CENTER,
      x_align: Clutter.ActorAlign.END,
    });

    focusButton.connect("clicked", () => {
      this._manager?.update(index, {
        ...task,
        isFocused: !isFocused,
      });
      this._populate();
    });

    // Drag handle — "=" style grip, pinned to the extreme right of the row
    const dragHandle = new St.Button({
      child: new St.Label({
        text: "=",
        style_class: "drag-icon",
        y_align: Clutter.ActorAlign.CENTER,
      }),
      style_class: "drag-btn",
      y_align: Clutter.ActorAlign.CENTER,
      x_align: Clutter.ActorAlign.END,
      x_expand: false,
      reactive: true,
      can_focus: true,
      track_hover: true,
    });

    box.add_child(label);
    box.add_child(copyButton);
    box.add_child(focusButton);
    box.add_child(removeButton);
    box.add_child(dragHandle);

    // Add the box to the item
    item.add_child(box);

    // Shell DND: same delegate on row + handle so both drag source and drop target work
    const delegate: TodoItemDelegate = {
      isTodoItem: true,
      index,
      actor: item as unknown as Clutter.Actor,
      getDragActor: () => {
        const clone = new Clutter.Clone({
          source: item as unknown as Clutter.Actor,
          opacity: 200,
        });
        return clone;
      },
      getDragActorSource: () => item as unknown as Clutter.Actor,
      handleDragOver: (source, _actor, _x, _y, _time) => {
        if (!source?.isTodoItem || source.index === index) {
          this._clearDragOver();
          return DND.DragMotionResult.NO_DROP;
        }
        this._setDragOver(item);
        return DND.DragMotionResult.MOVE_DROP;
      },
      acceptDrop: (source, _actor, _x, y, _time) => {
        this._clearDragOver();
        if (!source?.isTodoItem || source.index === index) {
          return false;
        }
        const height = (item as unknown as Clutter.Actor).height ?? 0;
        const placeAfter = height > 0 ? y > height / 2 : false;
        // Persist only; rebuild on drag-end so source actors stay alive during DND
        const reordered = this._reorderTodo(source.index, index, placeAfter);
        if (reordered) {
          this._pendingRepopulate = true;
        }
        return reordered;
      },
    };

    (item as unknown as { _delegate: TodoItemDelegate })._delegate = delegate;
    (dragHandle as unknown as { _delegate: TodoItemDelegate })._delegate =
      delegate;

    const draggable = DND.makeDraggable(dragHandle, {
      dragActorOpacity: 200,
    });
    draggable.connect("drag-begin", () => {
      item.add_style_class_name("dragging");
      return true;
    });
    draggable.connect("drag-end", () => {
      // Source row is still alive here (UI rebuild is deferred until after drop)
      item.remove_style_class_name("dragging");
      this._clearDragOver();
      if (this._pendingRepopulate) {
        this._pendingRepopulate = false;
        this._populate();
        this._refreshTodosButtonText();
      }
      return true;
    });

    // Finally, add the item to the todosBox
    this.todosBox?.add_child(item);
  }

  _setDragOver(item: PopupMenu.PopupMenuItem) {
    if (this._dragOverItem === item) {
      return;
    }
    this._clearDragOver();
    item.add_style_class_name("drag-over");
    this._dragOverItem = item;
  }

  _clearDragOver() {
    if (this._dragOverItem) {
      this._dragOverItem.remove_style_class_name("drag-over");
      this._dragOverItem = null;
    }
  }

  /**
   * Persist a reorder in GSettings.
   * `placeAfter` decides insert before vs after the drop target row.
   * Returns true if order changed (caller rebuilds UI after drag-end).
   */
  _reorderTodo(
    fromIndex: number,
    targetIndex: number,
    placeAfter: boolean
  ): boolean {
    let toIndex = placeAfter ? targetIndex + 1 : targetIndex;
    // After removing fromIndex, later indices shift left
    if (fromIndex < toIndex) {
      toIndex -= 1;
    }
    if (fromIndex === toIndex) {
      return false;
    }
    this._manager?.reorder(fromIndex, toIndex);
    return true;
  }

  _refreshTodosButtonText() {
    const total = this._manager?.getTotalUndone();
    this.buttonText?.clutterText.set_text(buttonIcon(total ?? 0));
  }

  _toggleShortcut() {
    Main.wm.addKeybinding(
      "open-todoit",
      this.getSettings(),
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.ALL,
      () => {
        this.button?.menu.toggle();
        this.input?.clutterText.grab_key_focus();
      }
    );
  }

  disable() {
    this._clearDragOver();
    this._pendingRepopulate = false;
    this._indicator?.destroy();
    this.mainBox?.destroy();
    this.todosBox?.destroy();
    this.buttonText?.destroy();
    this.input?.destroy();
    this.button?.destroy();

    Main.wm.removeKeybinding("open-todoit")

    this.mainBox = null;
    this.todosBox = null;
    this.buttonText = null;
    this.input = null;
    this.button = null;
    this._indicator = null;
    this._dragOverItem = null;
  }
}
