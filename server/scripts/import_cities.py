"""
worldcities.csv → cities 테이블 임포트 스크립트
실행: cd server && uv run python scripts/import_cities.py
"""

from __future__ import annotations

import csv
import sys
import time
from pathlib import Path
from typing import Any

SERVER_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_DIR))

from app.database.config import database_settings  # noqa: E402

CSV_PATH = SERVER_DIR / "src" / "worldcities.csv"
BATCH_SIZE = 50
SLEEP_SECONDS = 1


def get_sync_dsn() -> str:
    uri = database_settings.DATABASE_URI
    uri = uri.replace("postgresql+asyncpg://", "postgresql://")
    if "ssl=require" in uri:
        uri = uri.replace("ssl=require", "sslmode=require")
    return uri


def load_csv() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(
                {
                    "id": int(row["id"]),
                    "city": row["city"],
                    "city_ascii": row["city_ascii"],
                    "country": row["country"],
                    "lat": float(row["lat"]) if row["lat"] else None,
                    "lng": float(row["lng"]) if row["lng"] else None,
                    "iso2": row["iso2"] or None,
                    "iso3": row["iso3"] or None,
                    "admin_name": row["admin_name"] or None,
                    "capital": row["capital"] or None,
                    "population": int(float(row["population"]))
                    if row["population"]
                    else None,
                }
            )
    return rows


def translate_batch(texts: list[str]) -> list[str]:
    from deep_translator import GoogleTranslator  # type: ignore[import-untyped]

    try:
        raw = GoogleTranslator(source="en", target="ko").translate_batch(texts)  # type: ignore[no-untyped-call]
        results: list[str | None] = list(raw)  # type: ignore[arg-type]
        return [r if r else t for r, t in zip(results, texts)]
    except Exception as e:
        print(f"\n  [경고] 번역 실패: {e} — 원본 텍스트 사용")
        return texts


def translate_countries(rows: list[dict[str, Any]]) -> dict[str, str]:
    countries = sorted({r["country"] for r in rows})
    total = len(countries)
    print(f"국가명 번역 시작: {total}개")

    mapping: dict[str, str] = {}
    for i in range(0, total, BATCH_SIZE):
        batch = countries[i : i + BATCH_SIZE]
        translated = translate_batch(batch)
        mapping.update(zip(batch, translated))
        done = min(i + BATCH_SIZE, total)
        print(f"  국가 번역: {done}/{total}")
        if done < total:
            time.sleep(SLEEP_SECONDS)

    return mapping


def translate_cities(rows: list[dict[str, Any]]) -> list[str]:
    city_names = [r["city"] for r in rows]
    total = len(city_names)
    total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"도시명 번역 시작: {total}개 ({total_batches}배치)")

    results: list[str] = []
    for i in range(0, total, BATCH_SIZE):
        batch = city_names[i : i + BATCH_SIZE]
        translated = translate_batch(batch)
        results.extend(translated)

        done = min(i + BATCH_SIZE, total)
        batch_num = i // BATCH_SIZE + 1
        print(
            f"  도시 번역: {done}/{total} (배치 {batch_num}/{total_batches})",
            end="\r",
            flush=True,
        )

        if done < total:
            time.sleep(SLEEP_SECONDS)

    print()
    return results


def upsert_to_db(
    rows: list[dict[str, Any]], city_ko_list: list[str], country_ko_map: dict[str, str]
) -> None:
    import psycopg

    UPSERT_SQL = """
        INSERT INTO cities
            (id, city, city_ascii, country, lat, lng,
             iso2, iso3, admin_name, capital, population, city_ko, country_ko)
        VALUES
            (%(id)s, %(city)s, %(city_ascii)s, %(country)s, %(lat)s, %(lng)s,
             %(iso2)s, %(iso3)s, %(admin_name)s, %(capital)s, %(population)s,
             %(city_ko)s, %(country_ko)s)
        ON CONFLICT (id) DO UPDATE SET
            city        = EXCLUDED.city,
            city_ascii  = EXCLUDED.city_ascii,
            country     = EXCLUDED.country,
            lat         = EXCLUDED.lat,
            lng         = EXCLUDED.lng,
            iso2        = EXCLUDED.iso2,
            iso3        = EXCLUDED.iso3,
            admin_name  = EXCLUDED.admin_name,
            capital     = EXCLUDED.capital,
            population  = EXCLUDED.population,
            city_ko     = EXCLUDED.city_ko,
            country_ko  = EXCLUDED.country_ko
    """

    COMMIT_CHUNK = 1000
    total = len(rows)
    print("DB 삽입 시작...")

    with psycopg.connect(get_sync_dsn()) as conn:
        with conn.cursor() as cur:
            for i, (row, city_ko) in enumerate(zip(rows, city_ko_list)):
                cur.execute(
                    UPSERT_SQL,
                    {
                        **row,
                        "city_ko": city_ko,
                        "country_ko": country_ko_map.get(row["country"]),
                    },
                )
                if (i + 1) % COMMIT_CHUNK == 0:
                    conn.commit()
                    print(f"  DB 삽입: {i + 1}/{total} ({(i + 1) / total * 100:.1f}%)")
        conn.commit()

    print(f"DB 삽입 완료: {total}행")


def main() -> None:
    if not CSV_PATH.exists():
        print(f"CSV 파일을 찾을 수 없습니다: {CSV_PATH}")
        sys.exit(1)

    print(f"CSV 로드 중: {CSV_PATH}")
    rows = load_csv()
    print(f"로드 완료: {len(rows)}행\n")

    country_ko_map = translate_countries(rows)
    print()

    city_ko_list = translate_cities(rows)
    print()

    upsert_to_db(rows, city_ko_list, country_ko_map)
    print("\n임포트 완료.")


if __name__ == "__main__":
    main()
