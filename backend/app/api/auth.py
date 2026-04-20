from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from app.schemas import (
    UserCreate, UserResponse,
    LoginRequest, LogoutRequest,
)
from app.services.auth_service import AuthService
from app.api.dependencies import get_auth_service, get_current_user_from_cookies
import app.models as models
from app.core_auth import set_auth_cookies, clear_auth_cookies

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    response: Response,
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    result = auth_service.register(user_data)
    set_auth_cookies(
        response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"]
    )
    return result["user"]


@router.post("/login", response_model=UserResponse)
def login(
    response: Response,
    login_data: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    result = auth_service.login(login_data.email, login_data.password)
    set_auth_cookies(
        response,
        access_token=result["access_token"],
        refresh_token=result["refresh_token"]
    )
    return result["user"]


@router.post("/refresh")
def refresh_token(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token не найден в cookies"
        )
    
    try:
        result = auth_service.refresh(refresh_token)
        set_auth_cookies(
            response,
            access_token=result["access_token"],
            refresh_token=result["refresh_token"]
        )
        return {"message": "Токены успешно обновлены"}
    except HTTPException as e:
        clear_auth_cookies(response)
        raise e


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        auth_service.logout(refresh_token)
    clear_auth_cookies(response)
    return {"message": "Сессия успешно завершена"}


@router.post("/logout-all")
def logout_all(
    response: Response,
    current_user: models.User = Depends(get_current_user_from_cookies),
    auth_service: AuthService = Depends(get_auth_service),
):
    auth_service.logout_all(current_user.id)
    clear_auth_cookies(response)
    return {"message": "Все сессии успешно завершены"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        current_user = await get_current_user_from_cookies(request, auth_service)
        return current_user
    except HTTPException as e:
        clear_auth_cookies(response)
        raise e


@router.get("/check")
async def check_auth(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        current_user = await get_current_user_from_cookies(request, auth_service)
        return {
            "authenticated": True,
            "user": UserResponse.model_validate(current_user)
        }
    except HTTPException:
        clear_auth_cookies(response)
        return {
            "authenticated": False,
            "user": None
        }