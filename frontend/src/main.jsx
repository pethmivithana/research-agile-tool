import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { store } from './app/store.js'
import { queryClient } from './app/queryClient.js'
import App from './App.jsx'
import './index.css'

// Suppress react-beautiful-dnd defaultProps warning (third-party library issue)
const originalError = console.error
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Support for defaultProps will be removed from memo components') &&
    args[0].includes('Droppable')
  ) {
    return // Suppress this specific warning
  }
  originalError.call(console, ...args)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
)