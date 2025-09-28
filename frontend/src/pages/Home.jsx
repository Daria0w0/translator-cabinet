import React from "react";

export default function Home() {
  return (
    <div>
      <h2>Главная</h2>
      <p>Это домашняя страница Сайта.</p>
      <div style={{ marginTop: 24 }}>
        <h2> Что будет уметь сервис:</h2>
        <ul>
          <li>- Перевод документов</li>
          <li>- Память документов</li>
          <li>- Терминологическая база</li>
          <li>- Редактура текстов</li>
        </ul>
      </div>
    </div>
  );
}