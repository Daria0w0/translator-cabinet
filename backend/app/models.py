from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base 

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    is_translator = Column(Boolean, default=False)
    is_editor = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects" 

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    source_lang = Column(String(50), nullable=False)
    target_lang = Column(String(50), nullable=False)
    file_name = Column(String(255))
    status = Column(String(50), default="Новый")
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    owner = relationship("User", back_populates="projects")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")

class DocumentSegment(Base):
    __tablename__ = "document_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_file_id = Column(Integer, ForeignKey("project_files.id", ondelete="CASCADE"))
    segment_index = Column(Integer, nullable=False)
    original_text = Column(Text, nullable=False)
    translated_text = Column(Text)
    status = Column(String(50), default="new")
    translator_id = Column(Integer, ForeignKey("users.id"))
    editor_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    project_file = relationship("ProjectFile", back_populates="segments")
    translator = relationship("User", foreign_keys=[translator_id])
    editor = relationship("User", foreign_keys=[editor_id])

class ProjectFile(Base):
    __tablename__ = "project_files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100))
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    project = relationship("Project", back_populates="files")
    segments = relationship("DocumentSegment", back_populates="project_file", cascade="all, delete-orphan")