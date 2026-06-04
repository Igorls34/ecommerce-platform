const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeElement {
  constructor(tagName = 'div', id = null, ownerDocument = null) {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.ownerDocument = ownerDocument;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = false;
    this.disabled = false;
    this.src = '';
    this.files = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.children = [];
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(handler);
  }

  dispatchEvent(eventName, eventObject = {}) {
    const handlers = this.listeners[eventName] || [];
    return Promise.all(handlers.map((handler) => handler(eventObject)));
  }

  appendChild(child) {
    this.children.push(child);
    if (this.ownerDocument) {
      this.ownerDocument._registerElement(child);
    }
    return child;
  }

  removeAttribute(attributeName) {
    delete this.attributes[attributeName];
    if (attributeName === 'src') {
      this.src = '';
    }
  }

  setAttribute(attributeName, value) {
    this.attributes[attributeName] = value;
  }
}

class FakeDocument {
  constructor() {
    this.elementsById = new Map();
    this.listeners = {};
    this.allElements = [];
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(handler);
  }

  async dispatchEvent(eventName) {
    const handlers = this.listeners[eventName] || [];
    for (const handler of handlers) {
      await handler();
    }
  }

  createElement(tagName) {
    return new FakeElement(tagName, null, this);
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  registerElement(id, element = new FakeElement('div', id, this)) {
    element.id = id;
    element.ownerDocument = this;
    this.elementsById.set(id, element);
    this._registerElement(element);
    return element;
  }

  _registerElement(element) {
    if (!this.allElements.includes(element)) {
      this.allElements.push(element);
    }

    if (typeof element.innerHTML === 'string' && element.innerHTML) {
      this._parseButtonsFromInnerHTML(element.innerHTML);
    }
  }

  _parseButtonsFromInnerHTML(html) {
    const buttonRegex = /<button[\s\S]*?<\/button>/g;
    const buttonMatches = html.match(buttonRegex) || [];

    for (const buttonHtml of buttonMatches) {
      const actionMatch = buttonHtml.match(/data-action="([^"]+)"/);
      const idMatch = buttonHtml.match(/data-id="([^"]+)"/);
      const nameMatch = buttonHtml.match(/data-name="([^"]+)"/);

      if (!actionMatch) {
        continue;
      }

      const element = new FakeElement('button', null, this);
      element.dataset.action = actionMatch[1];

      if (idMatch) {
        element.dataset.id = idMatch[1];
      }

      if (nameMatch) {
        element.dataset.name = nameMatch[1];
      }

      this._registerElement(element);
    }
  }

  querySelectorAll(selector) {
    const actionMatch = selector.match(/^\[data-action="([^"]+)"\]$/);

    if (actionMatch) {
      return this.allElements.filter((element) => element.dataset.action === actionMatch[1]);
    }

    return [];
  }
}

function createLocalStorage(initialData = {}) {
  const store = new Map(Object.entries(initialData));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function createLocation(initialHref = 'http://localhost:5500/pages/index.html') {
  let currentHref = initialHref;

  return {
    get href() {
      return currentHref;
    },
    set href(value) {
      currentHref = value;
    },
    get search() {
      try {
        return new URL(currentHref, 'http://localhost').search;
      } catch {
        return '';
      }
    },
  };
}

function loadScript(relativePath, contextOverrides = {}) {
  const absolutePath = path.resolve(__dirname, '..', '..', 'src', 'pages', relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const document = contextOverrides.document || new FakeDocument();
  const location = contextOverrides.location || createLocation();
  const windowObject = contextOverrides.window || {
    location,
    alert: contextOverrides.alert || (() => undefined),
    confirm: contextOverrides.confirm || (() => true),
  };

  const context = {
    console,
    document,
    window: windowObject,
    localStorage: contextOverrides.localStorage || createLocalStorage(),
    fetch: contextOverrides.fetch || (async () => ({ ok: true, json: async () => ({}) })),
    alert: contextOverrides.alert || (() => undefined),
    FormData,
    Blob,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    requireAdminAuth: contextOverrides.requireAdminAuth,
    logoutAdmin: contextOverrides.logoutAdmin,
    getProducts: contextOverrides.getProducts,
    deleteProduct: contextOverrides.deleteProduct,
    getProductById: contextOverrides.getProductById,
    createProduct: contextOverrides.createProduct,
    updateProduct: contextOverrides.updateProduct,
    uploadProductImage: contextOverrides.uploadProductImage,
  };

  context.window.document = document;
  context.window.localStorage = context.localStorage;
  context.window.fetch = context.fetch;
  context.window.URL = contextOverrides.URL || { createObjectURL: () => 'blob:preview' };
  context.URL = context.window.URL;

  vm.createContext(context);
  vm.runInContext(source, context, { filename: absolutePath });

  return {
    context,
    document,
    window: context.window,
    localStorage: context.localStorage,
    location,
  };
}

module.exports = {
  FakeDocument,
  FakeElement,
  createLocalStorage,
  createLocation,
  loadScript,
};
