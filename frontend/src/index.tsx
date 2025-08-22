import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { store } from './store';
import { Provider } from 'react-redux';

// Initialize theme
const theme = localStorage.getItem('theme') || 'light';
if (theme === 'dark') {
  document.documentElement.classList.add('dark');
}

// Handle online/offline status
window.addEventListener('online', () => {
  store.dispatch({ type: 'ui/setOnline', payload: true });
});

window.addEventListener('offline', () => {
  store.dispatch({ type: 'ui/setOnline', payload: false });
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
