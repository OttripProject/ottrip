import asyncio
import re
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


async def _search_best_match(keyword: str) -> dict[str, Any] | None:
    """키워드로 검색해 제목이 정확히 일치하는 항목 반환, 없으면 첫 번째"""
    params = {
        "MobileOS": _MOBILE_OS,
        "MobileApp": _MOBILE_APP,
        "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
        "keyword": keyword,
        "_type": "json",
        "numOfRows": "10",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{_KOR_SERVICE_URL}/searchKeyword2", params=params)
        data: dict[str, Any] = response.json()
    items = _extract_items(data)
    if not items:
        return None
    kw = keyword.strip()
    for item in items:
        if str(item.get("title") or "").strip() == kw:
            return item
    return None


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
                title=" ".join(
                    str(item.get("rlteTatsNm") or "").replace("/", " ").split()
                ),
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
                title=" ".join(str(item.get("title") or "").replace("/", " ").split()),
                image_url=str(item["firstimage"]) if item.get("firstimage") else None,
                address=address,
                rank=None,
                dist=dist,
            )
        )
    return result


# 한국어 카테고리명 → contenttypeid 숫자 코드
_CONTENT_TYPE_NUMERIC: dict[str, str] = {
    "관광지": "12",
    "문화시설": "14",
    "축제·공연": "15",
    "여행코스": "25",
    "레포츠": "28",
    "숙박": "32",
    "쇼핑": "38",
    "음식점": "39",
}


def _strip_html(text: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = "\n".join(line.strip() for line in text.split("\n"))
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _s(v: Any) -> str | None:
    val = str(v).strip() if v is not None else ""
    val = _strip_html(val) if val else ""
    return val if val else None


def _url(v: Any) -> str | None:
    """href URL 우선 추출, 없으면 HTML 제거 후 반환"""
    val = str(v).strip() if v is not None else ""
    if not val:
        return None
    match = re.search(r'href=["\']([^"\']+)["\']', val, re.IGNORECASE)
    if match:
        return match.group(1).strip() or None
    return _s(v)


def _f(v: Any) -> float | None:
    try:
        return float(v) if v is not None else None
    except (ValueError, TypeError):
        return None


async def get_tourism_detail(
    name: str | None = None,
    content_id: str | None = None,
    content_type_id: str | None = None,
) -> TourismDetail | None:
    """관광지 상세 조회 (detailCommon2 + detailIntro2 병렬)"""
    if content_id and content_type_id:
        cid = content_id
        ctid = _CONTENT_TYPE_NUMERIC.get(content_type_id, content_type_id)
    else:
        if not name:
            return None
        keyword_result = await _search_best_match(name)
        if not keyword_result:
            return None
        cid = str(keyword_result.get("contentid") or "")
        ctid = str(keyword_result.get("contenttypeid") or "")
        if not cid:
            return None

    base_params = {
        "MobileOS": _MOBILE_OS,
        "MobileApp": _MOBILE_APP,
        "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
        "contentId": cid,
        "_type": "json",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        common_resp, intro_resp = await asyncio.gather(
            client.get(f"{_KOR_SERVICE_URL}/detailCommon2", params=base_params),
            client.get(
                f"{_KOR_SERVICE_URL}/detailIntro2",
                params={**base_params, "contentTypeId": ctid},
            ),
        )

    common_items = _extract_items(common_resp.json())
    if not common_items:
        return None
    c = common_items[0]
    i: dict[str, Any] = (_extract_items(intro_resp.json()) or [{}])[0]

    return TourismDetail(
        content_id=str(c.get("contentid") or ""),
        content_type_id=_s(c.get("contenttypeid")) or ctid,
        title=_s(c.get("title")),
        address=_s(c.get("addr1")),
        homepage=_url(c.get("homepage")),
        tel=_s(c.get("tel")),
        overview=_s(c.get("overview")),
        image_url=_s(c.get("firstimage")),
        mapx=_f(c.get("mapx")),
        mapy=_f(c.get("mapy")),
        # 관광지
        usetime=_s(i.get("usetime")),
        restdate=_s(i.get("restdate")),
        parking=_s(i.get("parking")),
        infocenter=_s(i.get("infocenter")) or _s(c.get("tel")),
        # 문화시설
        usetimeculture=_s(i.get("usetimeculture")),
        restdateculture=_s(i.get("restdateculture")),
        usefee=_s(i.get("usefee")),
        spendtime=_s(i.get("spendtime")),
        parkingculture=_s(i.get("parkingculture")),
        # 축제·공연
        eventdate=_s(i.get("eventdate")),
        eventplace=_s(i.get("eventplace")),
        playtime=_s(i.get("playtime")),
        usetimefestival=_s(i.get("usetimefestival")),
        bookingplace=_s(i.get("bookingplace")),
        agelimit=_s(i.get("agelimit")),
        # 여행코스
        distance=_s(i.get("distance")),
        taketime=_s(i.get("taketime")),
        schedule=_s(i.get("schedule")),
        infocentertourcourse=_s(i.get("infocentertourcourse")),
        # 레포츠
        usetimeleports=_s(i.get("usetimeleports")),
        restdateleports=_s(i.get("restdateleports")),
        usefeeleports=_s(i.get("usefeeleports")),
        reservation=_s(i.get("reservation")),
        parkingleports=_s(i.get("parkingleports")),
        # 숙박
        checkintime=_s(i.get("checkintime")),
        checkouttime=_s(i.get("checkouttime")),
        roomcount=_s(i.get("roomcount")),
        reservationlodging=_s(i.get("reservationlodging")),
        refundregulation=_s(i.get("refundregulation")),
        subfacility=_s(i.get("subfacility")),
        # 쇼핑
        opentime=_s(i.get("opentime")),
        restdateshopping=_s(i.get("restdateshopping")),
        saleitem=_s(i.get("saleitem")),
        parkingshopping=_s(i.get("parkingshopping")),
        # 음식점
        opentimefood=_s(i.get("opentimefood")),
        restdatefood=_s(i.get("restdatefood")),
        firstmenu=_s(i.get("firstmenu")),
        packing=_s(i.get("packing")),
        reservationfood=_s(i.get("reservationfood")),
        parkingfood=_s(i.get("parkingfood")),
    )
