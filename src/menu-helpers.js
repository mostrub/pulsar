const _ = require('underscore-plus');

const ItemSpecificities = new WeakMap();

// Add an item to a menu, ensuring separators are not duplicated.
function addItemToMenu(item, menu) {
  const lastMenuItem = _.last(menu);
  const lastMenuItemIsSpearator =
    lastMenuItem && lastMenuItem.type === 'separator';
  if (!(item.type === 'separator' && lastMenuItemIsSpearator)) {
    menu.push(item);
  }
}

function merge(menu, item, t, itemSpecificity = Infinity) {
  item = cloneAndLocaliseMenuItem(item, t);
  ItemSpecificities.set(item, itemSpecificity);
  const matchingItemIndex = findMatchingItemIndex(menu, item);

  if (matchingItemIndex === -1) {
    addItemToMenu(item, menu);
    return;
  }

  const matchingItem = menu[matchingItemIndex];
  if (item.submenu != null) {
    for (let submenuItem of item.submenu) {
      merge(matchingItem.submenu, submenuItem, t, itemSpecificity);
    }
  } else if (
    itemSpecificity &&
    itemSpecificity >= ItemSpecificities.get(matchingItem)
  ) {
    menu[matchingItemIndex] = item;
  }
}


function unmerge(menu, item, t) {
  item = cloneAndLocaliseMenuItem(item, t);
  const matchingItemIndex = findMatchingItemIndex(menu, item);
  if (matchingItemIndex === -1) {
    return;
  }

  const matchingItem = menu[matchingItemIndex];
  if (item.submenu != null) {
    for (let submenuItem of item.submenu) {
      unmerge(matchingItem.submenu, submenuItem);
    }
  }

  if (matchingItem.submenu == null || matchingItem.submenu.filter( ({type}) => type !== 'separator' ).length === 0) {
    menu.splice(matchingItemIndex, 1);
  }
}

function findMatchingItemIndex(menu, { type, id, submenu }) {
  if (type === 'separator') {
    return -1;
  }
  for (let index = 0; index < menu.length; index++) {
    const item = menu[index];
    if (item.id === id && (item.submenu != null) === (submenu != null)) {
      return index;
    }
  }
  return -1;
}

function normalizeLabel(label) {
  if (label == null) {
    return;
  }
  return process.platform === 'darwin' ? label : label.replace(/&/g, '');
}

function cloneAndLocaliseMenuItem(item, t) {
  item = _.pick(
    item,
    'type',
    'label',
    'localisedLabel',
    'id',
    'enabled',
    'visible',
    'command',
    'submenu',
    'commandDetail',
    'role',
    'accelerator',
    'before',
    'after',
    'beforeGroupContaining',
    'afterGroupContaining'
  );
  if (item.id === null || item.id === undefined) {
    item.id = normalizeLabel(item.label);
  }
  if (item.localisedLabel) {
    if (typeof item.localisedLabel === "string") {
      item.label = t(item.localisedLabel) ?? item.label;
    } else {
      item.label = t(item.localisedLabel.key, item.localisedLabel.opts) ?? item.label;
    }
  }
  if (item.submenu != null) {
    item.submenu = item.submenu.map(submenuItem => cloneAndLocaliseMenuItem(submenuItem, t));
  }
  return item;
}

// Determine the Electron accelerator for a given Atom keystroke.
//
// keystroke - The keystroke.
//
// Returns a String containing the keystroke in a format that can be interpreted
//   by Electron to provide nice icons where available.
function acceleratorForKeystroke(keystroke) {
  if (!keystroke) {
    return null;
  }
  let modifiers = keystroke.split(/-(?=.)/);
  const key = modifiers
    .pop()
    .toUpperCase()
    .replace('+', 'Plus');

  modifiers = modifiers.map(modifier =>
    modifier
      .replace(/shift/gi, 'Shift')
      .replace(/cmd/gi, 'Command')
      .replace(/ctrl/gi, 'Ctrl')
      .replace(/alt/gi, 'Alt')
  );

  const keys = [...modifiers, key];
  return keys.join('+');
}

module.exports = {
  merge,
  unmerge,
  normalizeLabel,
  cloneAndLocaliseMenuItem,
  acceleratorForKeystroke
};
