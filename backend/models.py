from sqlalchemy import Column, Integer, String, Text
from database import Base

class Project(Base):
    __tablename__ = "projects" 

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    source_lang = Column(String(50), nullable=False)
    target_lang = Column(String(50), nullable=False)
    file_name = Column(String(255))
    status = Column(String(50), default="Новый")