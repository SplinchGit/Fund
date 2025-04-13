import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client'; // <-- Changed import back
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render( // <-- Changed back
  <StrictMode>
    <App />
  </StrictMode>,
);