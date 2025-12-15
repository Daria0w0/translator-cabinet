import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy.orm import Session
from typing import List

import app.database as database
from app.api.auth import get_current_user 
import app.models as models
from app.schemas import ProjectFileResponse
from app.minio_client import minio_client

router = APIRouter()

@router.post("/{project_id}/upload-file", response_model=ProjectFileResponse)
async def upload_project_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, unique_filename)
        
        file_size = 0
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            file_size = len(content)
        
        object_name = f"project_{project_id}/{unique_filename}"
        minio_path = minio_client.upload_file(temp_file_path, object_name)
        
        if not minio_path:
            raise HTTPException(status_code=500, detail="Error uploading file to MinIO")
        
        os.remove(temp_file_path)
        
        db_file = models.ProjectFile(
            filename=unique_filename,
            original_name=file.filename,
            file_path=minio_path,
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
            project_id=project_id
        )
        
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
        return ProjectFileResponse.model_validate(db_file)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/{project_id}/files", response_model=List[ProjectFileResponse])
def get_project_files(
    project_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return [ProjectFileResponse.model_validate(f) for f in project.files]

@router.get("/{project_id}/files/{file_id}/content")
async def get_file_content(
    project_id: int,
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_file = db.query(models.ProjectFile).filter(
        models.ProjectFile.id == file_id,
        models.ProjectFile.project_id == project_id
    ).first()
    
    if not project_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        temp_dir = "temp_downloads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, project_file.filename)
        
        object_name = project_file.file_path.replace(f"{minio_client.bucket_name}/", "")
        
        success = minio_client.download_file(object_name, temp_file_path)
        
        if not success:
            raise HTTPException(status_code=500, detail="Error downloading file from MinIO")
        
        if project_file.filename.endswith('.txt'):
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            os.remove(temp_file_path)
            
            return {
                "content": content,
                "type": "text"
            }
        else:
            os.remove(temp_file_path)
            return {
                "content": f"File: {project_file.original_name} (format not supported for direct editing)",
                "type": "other"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

@router.delete("/{project_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_file(
    project_id: int,
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_file = db.query(models.ProjectFile).filter(
        models.ProjectFile.id == file_id,
        models.ProjectFile.project_id == project_id
    ).first()
    
    if not project_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        if os.path.exists(project_file.file_path):
            os.remove(project_file.file_path)
        
        db.delete(project_file)
        db.commit()
        return
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка при удалении файла")