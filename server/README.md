# Showbility server

## 사전 설정

- [`uv`](https://docs.astral.sh/uv/)가 설치되어 있어야 합니다.
- 나머지 설정 (python 버전 등)은 `uv`를 통해 관리됩니다.

## 개발 환경 설정하기

1. `.env` 채우기

2. 개발 환경 설정하기

```shell
# 가상환경 설정
uv venv

# pre-commit 훅 설정
uv run poe setup
```

> [!TIP] > Shell 세션에서 [`source .venv/bin/activate` 으로 가상환경을 활성화](https://docs.astral.sh/uv/pip/environments/#using-a-virtual-environment)하면 그 세션에서는 `uv run poe <command>` 대신 `poe <command>` 만 실행하면 됩니다.

3. 로컬 DB 설정하기

```shell
# docker로 DB 띄우기
uv run poe db up -d

# 생성된 DB에 스키마 적용하기
uv run poe migrate
```

4. Dev 서버 실행

```shell
uv run poe dev
```

> 기타 다른 커맨드들은 [`pyproject.toml`](pyproject.toml) 의 `[tool.poe.tasks]` 섹션 참고

## DB 스키마 변경하기

`sqlalchemy` 모델이 변경된 경우, 마이그레이션 파일을 생성해 주어야 합니다.

```shell
uv run poe revision -m <마이그레이션 이름>
```

위 명령어를 실행하면 [`migrations/versions/`](migrations/versions) 하위에 마이그레이션 파일이 생성됩니다.
자동 생성된 테이블 변경이 맞는지 확인하고 같이 커밋해 주세요.

`migrate` 명령어를 통해 정의된 마이그레이션을 DB에 적용할 수 있습니다.

```shell
uv run poe migrate
```
