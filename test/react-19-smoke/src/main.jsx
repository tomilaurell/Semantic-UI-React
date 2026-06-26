import * as React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

const messages = []
const originalError = console.error
const originalWarn = console.warn

function serialize(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack || arg.message
      }

      return typeof arg === 'string' ? arg : JSON.stringify(arg)
    })
    .join(' ')
}

console.error = (...args) => {
  messages.push(`error: ${serialize(args)}`)
  originalError(...args)
}

console.warn = (...args) => {
  messages.push(`warning: ${serialize(args)}`)
  originalWarn(...args)
}

try {
  createRoot(document.getElementById('root')).render(<App />)

  window.setTimeout(() => {
    window.__SUIR_REACT19_SMOKE__ = { messages }
    window.__SUIR_REACT19_SMOKE_DONE__ = true
  }, 250)
} catch (error) {
  window.__SUIR_REACT19_SMOKE__ = {
    error: error.stack || error.message,
    messages,
  }
  window.__SUIR_REACT19_SMOKE_DONE__ = true
}
