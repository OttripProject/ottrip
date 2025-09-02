from app.config import BaseConfig


class AIConfig(BaseConfig):
    OPENAI_API_KEY: str 
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    DEFAULT_MODEL: str = "gpt-4o-mini"
    ASSIST_SYSTEM_PROMPT: str = (
        "당신은 여행 일정 보조 전문가입니다. 과장 없이 사실 기반으로 조언하고, "
        "한국어로만 응답합니다. 아래 JSON 스키마를 정확히 지켜 출력하세요."
    )

    ASSIST_USER_PROMPT_TEMPLATE: str = (
        "다음 여행 정보를 바탕으로 준비물, 관광 명소, 로컬 팁을 추천해 주세요.\n\n"
        "[여행 정보]\n{context}\n\n"
        "출력 형식(JSON): {\n"
        '  "packing": ["..."],\n'
        '  "attractions": ["..."],\n'
        '  "local_tips": ["..."]\n'
        "}"
    )


ai_settings = AIConfig.create() 


