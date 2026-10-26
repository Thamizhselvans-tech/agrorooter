import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import init_db
from .camera import camera_manager
from .model import model_instance
from .routes import health, model, camera, predict

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agri-rover-backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    logger.info("Initializing Agri Rover AI Backend...")
    init_db()
    logger.info("Database initialized")
    
    # Check model loading status
    info = model_instance.get_info()
    if info["loaded"]:
        logger.info(f"Model ready with {info['total_classes']} classes ({info['tomato_classes_count']} tomato classes)")
    else:
        logger.warning(f"Model not loaded at startup: {info.get('error')}")

    yield

    # Shutdown:
    logger.info("Shutting down Agri Rover AI Backend...")
    camera_manager.stop()
    logger.info("Camera resources released safely")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Agri Rover AI Tomato Disease Detection and Raspberry Pi USB Webcam Integration",
    lifespan=lifespan
)

# CORS middleware for cross-origin frontend support (Vercel, Cloudflare, localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional API Key Authentication Middleware
@app.middleware("http")
async def api_key_auth_middleware(request: Request, call_next):
    # Bypass auth for CORS preflight, root status, docs, static files, or when API_KEY is unset
    if (
        request.method == "OPTIONS"
        or not settings.API_KEY
        or request.url.path in ("/", "/docs", "/openapi.json")
        or request.url.path.startswith("/captures")
    ):
        return await call_next(request)

    # Check header or query parameter
    client_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    if client_key != settings.API_KEY:
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized: Invalid or missing API Key"}
        )

    return await call_next(request)

# Mount captures directory for static file serving of leaf images
app.mount("/captures", StaticFiles(directory=settings.CAPTURES_DIR), name="captures")

# Register API routes
app.include_router(health.router)
app.include_router(model.router)
app.include_router(camera.router)
app.include_router(predict.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "endpoints": [
            "/api/health",
            "/api/model/info",
            "/api/camera/status",
            "/api/camera/start",
            "/api/camera/stop",
            "/api/stream",
            "/api/predict",
            "/api/predictions"
        ]
    }
