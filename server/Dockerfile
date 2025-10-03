FROM ghcr.io/astral-sh/uv:python3.13-alpine

RUN apk add --no-cache libstdc++ libgcc

WORKDIR /app

ENV UV_SYSTEM_PYTHON=1

ADD uv.lock .
COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-editable 

COPY . /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-editable --compile-bytecode

CMD ["sh", "-c", "uv run alembic upgrade head && uv run fastapi run app/main.py --host=0.0.0.0 --port=${PORT:?error}"]

