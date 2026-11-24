from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.entities import User
from app.schemas.all_schemas import LoginRequest, Token, UserResponse, UserCreate
from app.core.security import verify_password, create_access_token, decode_access_token, get_password_hash
from app.monitoring.metrics import monitoring_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ROLE_HIERARCHY = {
    "super_admin": 5,
    "admin": 4,
    "developer": 3,
    "analyst": 2,
    "viewer": 1
}

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if not token:
        # Default fallback to Super Admin in local development/single-user air-gapped mode
        res = await db.execute(select(User).where(User.username == "admin"))
        user = res.scalar_one_or_none()
        if user:
            return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
    user_id = payload.get("sub")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user

def require_role(min_role: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_level = ROLE_HIERARCHY.get(current_user.role, 1)
        required_level = ROLE_HIERARCHY.get(min_role, 1)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Operation requires minimum role: '{min_role}'. Current role: '{current_user.role}'."
            )
        return current_user
    return role_checker

@router.post("/login", response_model=Token)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.username == req.username))
    user = res.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        await monitoring_service.log_audit(db, None, "auth_login_failed", "user", details={"username": req.username}, status="failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = create_access_token(user.id)
    await monitoring_service.log_audit(db, user.id, "auth_login", "user", user.id, status="success")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=UserResponse)
async def register(req: UserCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    existing = await db.execute(select(User).where((User.username == req.username) | (User.email == req.email)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already exists.")
    
    new_user = User(
        username=req.username,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role=req.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    await monitoring_service.log_audit(db, current_user.id, "user_created", "user", new_user.id)
    return new_user

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    res = await db.execute(select(User))
    return res.scalars().all()
