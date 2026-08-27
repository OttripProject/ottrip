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
        response = await client.get(
            f"{_KOR_RELATION_URL}/searchKeyword1",
            params={**base_params, "numOfRows": "100"},
        )
        items = _extract_items(response.json())

    result: list[NearbyAttraction] = []
    for item in items:
        raw_rank = item.get("rlteRank")
        try:
            rank = int(raw_rank) if raw_rank is not None else None
        except (ValueError, TypeError):
            rank = None
        category_sub_raw = item.get("rlteCtgrySclsNm")
        raw_type = str(item.get("rlteCtgryLclsNm") or "")
        result.append(
            NearbyAttraction(
                content_id=str(item.get("rlteTatsCd") or ""),
                content_type_id=_CATEGORY_NORMALIZE.get(raw_type, raw_type),
                category_sub=str(category_sub_raw) if category_sub_raw else None,
                title=str(item.get("rlteTatsNm") or ""),
                image_url=None,
                address=str(item.get("rlteRegnNm") or "")
                + " "
                + str(item.get("rlteSignguNm") or ""),
                rank=rank,
            )
        )
    result.sort(key=lambda x: (x.rank is None, x.rank))
    return result


_CONTENT_TYPE_LABELS: dict[str, str] = {
    "12": "관광지",
    "14": "문화시설",
    "15": "축제·공연",
    "25": "여행코스",
    "28": "레포츠",
    "32": "숙박",
    "38": "쇼핑",
    "39": "음식점",
}

# 연관관광지 API 카테고리명 정규화 (배지 통일)
_CATEGORY_NORMALIZE: dict[str, str] = {
    "음식": "음식점",
}


async def get_location_based_attractions(
    mapx: float, mapy: float, area_cd: str, signgu_cd: str
) -> list[NearbyAttraction]:
    """위치 기반 관광지 조회 (1km 이내 3곳 미만이면 2km로 재시도)"""
    params: dict[str, str] = {
        "MobileOS": _MOBILE_OS,
        "MobileApp": _MOBILE_APP,
        "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
        "mapX": str(mapx),
        "mapY": str(mapy),
        "_type": "json",
    }
    if area_cd:
        params["lDongRegnCd"] = area_cd
    if signgu_cd:
        params["lDongSignguCd"] = signgu_cd

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_KOR_SERVICE_URL}/locationBasedList2",
            params={**params, "radius": "1000"},
        )
        items = _extract_items(resp.json())
        if len(items) < 3:
            resp = await client.get(
                f"{_KOR_SERVICE_URL}/locationBasedList2",
                params={**params, "radius": "2000"},
            )
            items = _extract_items(resp.json())

    result: list[NearbyAttraction] = []
    for item in items:
        type_id = str(item.get("contenttypeid") or "")
        addr_parts = (item.get("addr1") or "").split()
        address = " ".join(addr_parts[:2]) if addr_parts else None
        try:
            dist = float(item["dist"]) if item.get("dist") else None
        except (ValueError, TypeError):
            dist = None
        result.append(
            NearbyAttraction(
                content_id=str(item.get("contentid") or ""),
                content_type_id=_CONTENT_TYPE_LABELS.get(type_id, type_id),
                category_sub=None,
                title=str(item.get("title") or ""),
                image_url=str(item["firstimage"]) if item.get("firstimage") else None,
                address=address,
                rank=None,
                dist=dist,
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
