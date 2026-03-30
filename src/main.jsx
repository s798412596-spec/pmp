import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Mock window.storage API using localStorage
window.storage = {
  get: (key) => Promise.resolve({ value: localStorage.getItem(key) }),
  set: (key, value) => { localStorage.setItem(key, value); return Promise.resolve(); }
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
