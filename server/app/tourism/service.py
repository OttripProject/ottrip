from datetime import datetime
from typing import Any

import httpx

from .config import tourism_settings
from .schemas import NearbyAttraction, TourismDetail

_KOR_SERVICE_URL = "http://apis.data.go.kr/B551011/KorService2"
_KOR_RELATION_URL = "http://apis.data.go.kr/B551011/TarRlteTarService1"
_MOBILE_OS = "ETC"
_MOBILE_APP = "Ottrip"


def _extract_items(data: dict[str, Any]) -> list[dict[str, Any]]:
    body: Any = data.get("response", {}).get("body", {})  # type: ignore[union-attr]
    if not body or not isinstance(body, dict):
        return []
    items: Any = body.get("items", {})  # type: ignore[union-attr]
    if not items or isinstance(items, str):
        return []
    item_list: Any = items.get("item", [])  # type: ignore[union-attr]
    if not item_list:
        return []
    if isinstance(item_list, dict):
        return [item_list]
    return list(item_list)  # type: ignore[arg-type]


async def search_kor_keyword(keyword: str) -> dict[str, Any] | None:
    """장소명으로 국문관광정보서비스 검색 → 첫 번째 결과 반환"""
    params = {
        "MobileOS": _MOBILE_OS,
        "MobileApp": _MOBILE_APP,
        "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
        "keyword": keyword,
        "_type": "json",
        "numOfRows": "1",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{_KOR_SERVICE_URL}/searchKeyword2", params=params)
        data: dict[str, Any] = response.json()
    items = _extract_items(data)
    return items[0] if items else None


def _base_ym_3months_ago() -> str:
    now = datetime.now()
    month = now.month - 3
    year = now.year
    if month <= 0:
        month += 12
        year -= 1
    return f"{year}{month:02d}"


async def get_related_attractions(
    keyword: str, area_cd: str, signgu_cd: str
) -> list[NearbyAttraction]:
    """연관관광지 API 호출 → 전체 관광지 목록 반환"""
    base_params = {
        "MobileOS": _MOBILE_OS,
        "MobileApp": _MOBILE_APP,
        "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
        "baseYm": _base_ym_3months_ago(),
        "areaCd": area_cd,
        "signguCd": signgu_cd,
        "keyword": keyword,
        "_type": "json",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r1 = await client.get(
            f"{_KOR_RELATION_URL}/searchKeyword1",
            params={**base_params, "numOfRows": "1"},
        )
        body1: Any = r1.json().get("response", {}).get("body", {})  # type: ignore[union-attr]
        total = int(body1.get("totalCount", 0)) if isinstance(body1, dict) else 0  # type: ignore[union-attr]
        if not total:
            return []
        r2 = await client.get(
            f"{_KOR_RELATION_URL}/searchKeyword1",
            params={**base_params, "numOfRows": str(total)},
        )
        items = _extract_items(r2.json())

    result: list[NearbyAttraction] = []
    for item in items:
        result.append(
            NearbyAttraction(
                content_id=str(item.get("rlteTatsCd") or ""),
                content_type_id=str(item.get("rlteCtgryLclsNm") or ""),
                title=str(item.get("rlteTatsNm") or ""),
                image_url=None,
                address=str(item.get("rlteRegnNm") or "")
                + " "
                + str(item.get("rlteSignguNm") or ""),
            )
        )
    return result


async def get_tourism_detail_by_name(name: str) -> TourismDetail | None:
    """관광지명 → 키워드 검색 → 상세 조회"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        keyword_result = await search_kor_keyword(name)
        if not keyword_result:
            return None
        content_id = str(keyword_result.get("contentid") or "")
        if not content_id:
            return None

        params = {
            "MobileOS": _MOBILE_OS,
            "MobileApp": _MOBILE_APP,
            "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
            "contentId": content_id,
            "_type": "json",
        }
        response = await client.get(f"{_KOR_SERVICE_URL}/detailCommon2", params=params)
        data: dict[str, Any] = response.json()

    items = _extract_items(data)
    if not items:
        return None
    item = items[0]
    return TourismDetail(
        content_id=str(item.get("contentid") or ""),
        content_type_id=str(item.get("contenttypeid") or ""),
        title=str(item["title"]) if item.get("title") else None,
        address=str(item["addr1"]) if item.get("addr1") else None,
        homepage=str(item["homepage"]) if item.get("homepage") else None,
        tel=str(item["tel"]) if item.get("tel") else None,
        overview=str(item["overview"]) if item.get("overview") else None,
        image_url=str(item["firstimage"]) if item.get("firstimage") else None,
    )
