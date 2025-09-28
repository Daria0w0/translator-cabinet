import React from "react";
import { NavLink, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Projects from "./pages/Projects";
import User from "./pages/User";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <header>
        <h1>Кабинет переводчика</h1>
        <nav style={{ marginBottom: 16 }}>
          <NavLink to="/" style={{ marginRight: 12 }}>Главная</NavLink>
          <NavLink to="/user" style={{ marginRight: 12 }}>Личный кабинет</NavLink>
          <NavLink to="/projects" style={{ marginRight: 12 }}>Проекты</NavLink>
        </nav>
      </header>

      <main style={{ marginTop: 24 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/user" element={<User />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;