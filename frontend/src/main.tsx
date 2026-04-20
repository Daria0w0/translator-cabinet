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
import './pages/styles/Home.css';
import './pages/styles/AdminUserProjects.css';
import './pages/styles/AdminDashboard.css';
import './pages/styles/Blocked.css';
import './pages/styles/seo.css';

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