import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './pages/styles/Global.css';
import './pages/styles/Header.css';
import './pages/styles/Login.css';
import './pages/styles/Projects.css';
import './pages/styles/UserProfile.css';
import './pages/styles/Common.css';
import './pages/styles/TranslatorEditor.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);