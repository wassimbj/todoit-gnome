<h1 align="center"> Todoit Gnome Extension </h1>

<div align="center"><img src="static/tick.png"></div>

## Demo

![autocomplete](static/demo.gif)

## Features

- Add/remove/copy tasks
- Toggle tasks progress
- Toggle with a shortcut (Alt+Shift+Space)
- Focus on a specific task (moves the task to the top and highlight it with a bg color)
- Reorder tasks with drag-and-drop (grip handle on each row)

## Support
Todoit is built with the latest gnome API, which uses ESM to import the needed libraries.
So **as long as you have gnome version >= 45, todoit will work** 

## Install

Todoit is available on gnome extensions, you can [download it here](https://extensions.gnome.org/extension/7538)


### Manual install
All you need to use todoit is the **zip file**

### 1) Install gnome extensions manager

But before that, make sure you have **gnome extensions prefs** installed, search for `extensions` in your search bar, if it's not found install it with the command below.

```bash
sudo apt install gnome-shell-extension-prefs
```

### 2) Download the zip file

[Download todoit@wassimbj.github.io.zip](https://github.com/wassimbj/todoit-gnome/blob/master/todoit%40wassimbj.github.io.zip)

### 3) Extract and enable

Unzip the extension inside **`~/.local/share/gnome-shell/extensions`** folder

> Make sure to create the `extensions` folder if it doesn't exist

Now open the extensions manager and **enable the *Todo List* extension**.

> You can run `gnome-shell-extension-prefs` to open it, or directly from the apps list (Extensions).

The extracted zip file structure should look like this
```bash
todoit@wassimbj.github.io/
├── extension.js
├── LICENCE
├── manager.js
├── metadata.json
├── schemas
│   ├── gschemas.compiled
│   └── org.gnome.shell.extensions.todoit.gschema.xml
├── stylesheet.css
└── utils.js
```

## Credits
the very first icon is from [flaticon](https://www.flaticon.com)
