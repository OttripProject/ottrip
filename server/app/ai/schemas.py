from app.schemas import APISchema


class AIFlightBase(APISchema):
    success: bool
    text: str
    confidence: float

class AIFlightRead(AIFlightBase):
    pass