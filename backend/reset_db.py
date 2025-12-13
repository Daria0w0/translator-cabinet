import models
import database

print("Удаляем существующие таблицы...")
models.Base.metadata.drop_all(bind=database.engine)

print("Создаем новые таблицы...")
models.Base.metadata.create_all(bind=database.engine)

print("Таблицы успешно пересозданы!")