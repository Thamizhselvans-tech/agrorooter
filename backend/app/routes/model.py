from fastapi import APIRouter
from ..schemas import ModelInfoResponse
from ..model import model_instance

router = APIRouter(prefix="/api/model", tags=["Model"])

@router.get("/info", response_model=ModelInfoResponse)
def get_model_info():
    info = model_instance.get_info()
    return ModelInfoResponse(**info)
