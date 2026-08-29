from app.config import BaseConfig


class TourismConfig(BaseConfig):
    TOUR_SERVICE_KEY: str


tourism_settings = TourismConfig.create()
