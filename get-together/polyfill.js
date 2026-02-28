if (typeof global !== 'undefined' && !global.localStorage) {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0
  };
  global.window = global.window || { localStorage: global.localStorage };
}
