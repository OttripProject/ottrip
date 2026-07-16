"""
번역 완료된 city_ko 파일을 DB에 반영하는 스크립트
결과 파일 위치: server/src/translated/cities_01.json, cities_02.json, ...
파일 형식: [{"id": 123, "city_ko": "두바이"}, ...]

실행: cd server && uv run python scripts/update_city_ko.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

SERVER_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_DIR))

from app.database.config import database_settings  # noqa: E402

INPUT_DIR = SERVER_DIR / "src" / "translated"


def get_sync_dsn() -> str:
    uri = database_settings.DATABASE_URI
    uri = uri.replace("postgresql+asyncpg://", "postgresql://")
    if "ssl=require" in uri:
        uri = uri.replace("ssl=require", "sslmode=require")
    return uri


def main() -> None:
    import psycopg
    from psycopg import sql

    files = sorted(INPUT_DIR.glob("cities_*.json"))
    if not files:
        print(f"파일을 찾을 수 없습니다: {INPUT_DIR}/cities_*.json")
        sys.exit(1)

    print(f"파일 {len(files)}개 발견\n")

    with psycopg.connect(get_sync_dsn()) as conn:
        total_updated = 0

        for file in files:
            rows: list[dict[str, Any]] = json.loads(file.read_text(encoding="utf-8"))
            valid = [r for r in rows if r.get("city_ko")]

            if not valid:
                print(f"{file.name}: 건너뜀 (city_ko 없음)")
                continue

            values: list[tuple[Any, Any]] = [(r["id"], r["city_ko"]) for r in valid]
            placeholders = sql.SQL(", ").join(
                sql.SQL("({}, {})").format(sql.Placeholder(), sql.Placeholder())
                for _ in range(len(values))
            )
            query = sql.SQL(
                "UPDATE cities AS c SET city_ko = v.city_ko "
                "FROM (VALUES {rows}) AS v(id, city_ko) "
                "WHERE c.id = v.id::int"
            ).format(rows=placeholders)

            with conn.cursor() as cur:
                cur.execute(query, [x for pair in values for x in pair])
            conn.commit()

            total_updated += len(valid)
            print(f"{file.name}: {len(valid)}개 업데이트")

    print(f"\n완료: 총 {total_updated}개 업데이트")


if __name__ == "__main__":
    main()
