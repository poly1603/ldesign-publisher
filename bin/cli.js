#!/usr/bin/env node

import('../dist/cli/index.js').catch((error) => {
  console.error('Failed to start CLI:', error)
  process.exit(1)
})

