import React, { JSX } from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from "./pages/Home";
import Projects from "./pages/Projects";
import User from "./pages/User";
import NotFound from "./pages/NotFound";
import Header from "./components/Header"

export default function App() {
  return (
    <>
      <Header />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/user" element={<User />} />
          <Route path="/user/projects" element={<Projects />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
