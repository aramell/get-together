#!/usr/bin/env node

// Polyfill localStorage for Node.js environment
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  };
}

// Now run amplify deploy
require('child_process').execSync('npx amplify deploy --yes', {
  stdio: 'inherit',
  cwd: __dirname
});
