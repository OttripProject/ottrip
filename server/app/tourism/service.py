import asyncio
import math
import re
from datetime import date, datetime, time
from typing import Any

import httpx

from app.itinerary.models import Itinerary

from .config import tourism_settings
from .schemas import (
    CongestionItem,
    DaySuggestion,
    FestivalItem,
    NearbyAttraction,
    SuggestionPlace,
    TourismDetail,
)

_CONGESTION_THRESHOLD = 70.0  # CDF 지수 임계값 (상위 30% 혼잡 판정)

_KOR_SERVICE_URL = "http://apis.data.go.kr/B551011/KorService2"
_KOR_RELATION_URL = "http://apis.data.go.kr/B551011/TarRlteTarService1"
_TATS_CNCTR_URL = "http://apis.data.go.kr/B551011/TatsCnctrRateService"
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


async def find_area_codes(
    keyword: str, lat: float | None = None, lng: float | None = None
) -> tuple[str | None, str | None]:
    """키워드 검색 후 좌표가 있으면 가장 가까운 결과로 area/signgu 코드 반환"""
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
        return None, None

    if lat and lng:

        def _dist(item: dict[str, Any]) -> float:
            try:
                return _haversine_m(lat, lng, float(item["mapy"]), float(item["mapx"]))
            except (KeyError, TypeError, ValueError):
                return float("inf")

        best = min(items, key=_dist)
    else:
        best = items[0]

    area_cd = str(best.get("lDongRegnCd") or "") or None
    signgu_raw = str(best.get("lDongSignguCd") or "") or None
    signgu_cd = (area_cd + signgu_raw) if area_cd and signgu_raw else None
    return area_cd, signgu_cd


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
        common_resp, intro_resp, image_resp = await asyncio.gather(
            client.get(f"{_KOR_SERVICE_URL}/detailCommon2", params=base_params),
            client.get(
                f"{_KOR_SERVICE_URL}/detailIntro2",
                params={**base_params, "contentTypeId": ctid},
            ),
            client.get(
                f"{_KOR_SERVICE_URL}/detailImage2",
                params={**base_params, "imageYN": "Y", "numOfRows": "10"},
            ),
        )

    common_items = _extract_items(common_resp.json())
    if not common_items:
        return None
    c = common_items[0]
    i: dict[str, Any] = (_extract_items(intro_resp.json()) or [{}])[0]
    image_items = _extract_items(image_resp.json()) or []
    images = [url for item in image_items if (url := _s(item.get("originimgurl")))]

    return TourismDetail(
        content_id=str(c.get("contentid") or ""),
        content_type_id=_s(c.get("contenttypeid")) or ctid,
        title=_s(c.get("title")),
        address=_s(c.get("addr1")),
        homepage=_url(c.get("homepage")),
        tel=_s(c.get("tel")),
        telname=_s(c.get("telname")),
        overview=_s(c.get("overview")),
        image_url=_s(c.get("firstimage")),
        images=images,
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
        program=_s(i.get("program")),
        sponsor1=_s(i.get("sponsor1")),
        sponsor1tel=_s(i.get("sponsor1tel")),
        sponsor2=_s(i.get("sponsor2")),
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
        infocenterlodging=_s(i.get("infocenterlodging")),
        parkinglodging=_s(i.get("parkinglodging")),
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


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """두 좌표 간 거리 (미터)"""
    import math

    R = 6_371_000
    p = math.pi / 180
    a = (
        math.sin((lat2 - lat1) * p / 2) ** 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lng2 - lng1) * p / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


async def get_festivals_near_itineraries(
    area_dates: dict[str, tuple[str, str]],  # {area_cd: (start, end)}
    locations: list[tuple[float, float, str, str]],  # (lat, lng, date, location_name)
    radius_m: float | None = 1000.0,
) -> list[FestivalItem]:
    """지역코드별 축제 병렬 조회 후 날짜 겹침 필터링. radius_m 지정 시 좌표 거리 필터 추가 적용."""
    if not area_dates:
        return []

    async def _fetch(area_cd: str, start: str, end: str) -> list[dict[str, Any]]:
        params = {
            "MobileOS": _MOBILE_OS,
            "MobileApp": _MOBILE_APP,
            "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
            "lDongRegnCd": area_cd,
            "eventStartDate": start.replace("-", ""),
            "eventEndDate": end.replace("-", ""),
            "_type": "json",
            "numOfRows": "100",
            "arrange": "A",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{_KOR_SERVICE_URL}/searchFestival2", params=params
            )
            return _extract_items(resp.json())

    fetched = await asyncio.gather(
        *[_fetch(area_cd, start, end) for area_cd, (start, end) in area_dates.items()],
        return_exceptions=True,
    )

    seen_raw: set[str] = set()
    all_items: list[dict[str, Any]] = []
    for r in fetched:
        if not isinstance(r, list):
            continue
        for item in r:
            cid = str(item.get("contentid") or "")
            if cid and cid not in seen_raw:
                seen_raw.add(cid)
                all_items.append(item)

    result: list[FestivalItem] = []
    for item in all_items:
        cid = str(item.get("contentid") or "")
        ctid = str(item.get("contenttypeid") or "")
        if ctid and ctid != "15":
            continue
        fx = _f(item.get("mapx"))
        fy = _f(item.get("mapy"))
        start_dt = str(item.get("eventstartdate") or "")
        end_dt = str(item.get("eventenddate") or start_dt)
        matched_dist: float | None = None
        matched_location_name: str | None = None
        matched_date: str | None = None
        for lat, lng, idate, loc_name in locations:
            idate_fmt = idate.replace("-", "")
            if not (start_dt <= idate_fmt <= end_dt):
                continue
            if not (fx and fy):
                continue
            if radius_m is None:
                matched_location_name = loc_name
                matched_date = idate
                break
            dist = _haversine_m(lat, lng, fy, fx)
            if dist <= radius_m:
                matched_dist = dist
                matched_location_name = loc_name
                matched_date = idate
                break
        else:
            continue
        result.append(
            FestivalItem(
                content_id=cid,
                content_type_id=ctid or None,
                title=" ".join(str(item.get("title") or "").split()),
                address=_s(item.get("addr1")),
                event_start_date=start_dt,
                event_end_date=end_dt,
                image_url=_s(item.get("firstimage")),
                image_url2=_s(item.get("firstimage2")),
                lclsSystm2=_s(item.get("lclsSystm2")),
                tel=_s(item.get("tel")),
                mapx=fx,
                mapy=fy,
                dist=matched_dist,
                matched_location_name=matched_location_name,
                matched_date=matched_date,
            )
        )
    return result


async def get_congestion_rate(
    area_cd: str,
    signgu_cd: str,
    itinerary_date: str,
    location_name: str | None = None,
) -> list[CongestionItem]:
    """예정일 집중률이 예측기간 평균의 RATIO배 이상 + 절대 하한 이상이면 혼잡 항목 반환"""
    params: dict[str, str] = {
        "MobileOS": _MOBILE_OS,
        "MobileApp": _MOBILE_APP,
        "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
        "areaCd": area_cd,
        "signguCd": signgu_cd,
        "_type": "json",
        "numOfRows": "31",
    }
    if location_name:
        params["tAtsNm"] = location_name

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{_TATS_CNCTR_URL}/tatsCnctrRatedList", params=params)
        items = _extract_items(resp.json())

    if not items:
        return []

    idate_fmt = itinerary_date.replace("-", "")
    target = next(
        (item for item in items if _s(item.get("baseYmd")) == idate_fmt), None
    )
    if not target:
        return []

    try:
        rate = (
            float(target["cnctrRate"]) if target.get("cnctrRate") is not None else None
        )
    except (ValueError, TypeError):
        rate = None

    if rate is not None and rate >= _CONGESTION_THRESHOLD:
        return [
            CongestionItem(
                tats_nm=_s(target.get("tAtsNm")),
                cnctr_rate=rate,
                base_ymd=_s(target.get("baseYmd")),
            )
        ]
    return []


# ── 빈 슬롯 추천 ──────────────────────────────────────────────────────────────

_SUGGEST_ACTIVE_START = 9 * 60  # 09:00
_SUGGEST_ACTIVE_END = 22 * 60  # 22:00
_SUGGEST_MIN_SLOT = 90
_SUGGEST_MIN_VISIT = 30
_SUGGEST_MAX_RESULTS = 3
_SUGGEST_MAX_SAME_CAT = 2

# 빈 시간(분) → 검색 반경(m) 단계표 (오름차순)
_SUGGEST_RADIUS_TABLE = [
    (90, 500),
    (120, 1000),
    (180, 2000),
    (240, 3000),
]

_SUGGEST_EXCLUDE_TYPES = {"32", "15"}  # 숙박, 축제

_SUGGEST_CAT_LABELS: dict[str, str] = {
    "12": "관광지",
    "14": "문화시설",
    "25": "여행코스",
    "28": "레포츠",
    "38": "쇼핑",
    "39": "음식점",
}

_SUGGEST_OPEN_FIELDS: dict[str, str] = {
    "12": "usetime",
    "14": "usetimeculture",
    "28": "usetimeleports",
    "38": "opentime",
    "39": "opentimefood",
}

_SUGGEST_TIME_RANGE_RE = re.compile(r"(\d{1,2}:\d{2})\s*[~\-]\s*(\d{1,2}:\d{2})")


def _t2m(t: time) -> int:
    return t.hour * 60 + t.minute


def _m2s(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


def _has_valid_coords(it: Itinerary) -> bool:
    loc = it.location
    if not loc:
        return False
    return not (loc.latitude == 0 and loc.longitude == 0)


def _suggest_find_slot(day_its: list[Itinerary]) -> dict[str, Any] | None:
    sorted_its = sorted(day_its, key=lambda x: x.start_time)
    slots: list[dict[str, Any]] = []

    for i, it in enumerate(sorted_its):
        end_mins = _t2m(it.end_time)
        is_last = i == len(sorted_its) - 1
        next_it = None if is_last else sorted_its[i + 1]
        next_start = _SUGGEST_ACTIVE_END if is_last else _t2m(next_it.start_time)  # type: ignore[union-attr]

        slot_start = max(end_mins, _SUGGEST_ACTIVE_START)
        slot_end = min(next_start, _SUGGEST_ACTIVE_END)
        duration = slot_end - slot_start

        if duration < _SUGGEST_MIN_SLOT or not _has_valid_coords(it):
            continue

        next_name: str | None = None
        next_start_str: str | None = None
        next_lat: float | None = None
        next_lng: float | None = None
        if next_it and next_it.location:
            next_name = next_it.location.name
            next_start_str = _m2s(_t2m(next_it.start_time))
            next_lat = next_it.location.latitude
            next_lng = next_it.location.longitude

        slots.append(
            {
                "start": slot_start,
                "end": slot_end,
                "duration": duration,
                "center_lat": it.location.latitude,  # type: ignore[union-attr]
                "center_lng": it.location.longitude,  # type: ignore[union-attr]
                "prev_name": it.location.name or "",  # type: ignore[union-attr]
                "prev_end": _m2s(_t2m(it.end_time)),
                "next_name": next_name,
                "next_start": next_start_str,
                "next_lat": next_lat,
                "next_lng": next_lng,
            }
        )

    if not slots:
        return None
    return max(slots, key=lambda s: (s["duration"], -s["start"]))


def _suggest_is_open(
    intro: dict[str, Any], type_id: str, slot_start: int, slot_end: int
) -> bool:
    field = _SUGGEST_OPEN_FIELDS.get(type_id)
    if not field:
        return True
    text: str = intro.get(field) or ""
    if not text:
        return True
    ranges = [
        (
            int(m.group(1).split(":")[0]) * 60 + int(m.group(1).split(":")[1]),
            int(m.group(2).split(":")[0]) * 60 + int(m.group(2).split(":")[1]),
        )
        for m in _SUGGEST_TIME_RANGE_RE.finditer(text)
    ]
    if not ranges:
        return True
    return any(s <= slot_start < e for s, e in ranges)


_LUNCH = (11 * 60 + 30, 14 * 60)  # 11:30 ~ 14:00
_DINNER = (17 * 60 + 30, 20 * 60)  # 17:30 ~ 20:00


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _format_dist(dist_m: float) -> str:
    if dist_m < 2000:
        return f"도보 {max(1, round(dist_m / 50))}분"
    return f"약 {dist_m / 1000:.1f}km"


def _parse_closing_time(intro: dict[str, Any], type_id: str) -> int | None:
    field = _SUGGEST_OPEN_FIELDS.get(type_id)
    if not field:
        return None
    text: str = intro.get(field) or ""
    matches = list(_SUGGEST_TIME_RANGE_RE.finditer(text))
    if not matches:
        return None
    h, m = matches[-1].group(2).split(":")
    return int(h) * 60 + int(m)


def _suggest_front(slot: dict[str, Any]) -> str:
    s: int = slot["start"]
    e: int = slot["end"]
    pn: str = slot["prev_name"]
    pe: str = slot["prev_end"]
    nn: str | None = slot["next_name"]
    ns: str | None = slot["next_start"]

    if nn and ns:
        if s < _LUNCH[1] and e > _LUNCH[0]:
            return f"{pn}({pe} 종료)와 {nn}({ns} 시작) 사이 점심 시간이 비어 있어요."
        if s < _DINNER[1] and e > _DINNER[0]:
            return f"{pn}({pe} 종료)와 {nn}({ns} 시작) 사이 저녁 시간이 비어 있어요."
        return f"{pn} 일정이 {pe}에 끝난 뒤 {nn} 전까지 비어 있어요."
    return f"{pn} 일정이 {pe}에 끝난 뒤 일정이 없어요."


def _suggest_back(
    slot: dict[str, Any],
    dist_m: float,
    intro: dict[str, Any],
    type_id: str,
    place_lat: float | None,
    place_lng: float | None,
) -> str:
    # 1순위: 18시 이후 빈 시간
    if slot["start"] >= 18 * 60:
        closing = _parse_closing_time(intro, type_id)
        if closing is not None:
            return f"{_m2s(closing)}까지 영업해요."

    # 2순위: 돌아가는 시간 ≤ 5분
    next_lat: float | None = slot.get("next_lat")
    next_lng: float | None = slot.get("next_lng")
    if next_lat and next_lng and place_lat and place_lng:
        clat: float = slot["center_lat"]
        clng: float = slot["center_lng"]
        direct = _haversine(clat, clng, next_lat, next_lng)
        via = _haversine(clat, clng, place_lat, place_lng) + _haversine(
            place_lat, place_lng, next_lat, next_lng
        )
        if (via - direct) / 50 <= 5:
            return "두 장소를 잇는 경로 중간에 있어요."

    # 3순위: 그 외
    return f"조금 돌아가지만 {_format_dist(dist_m)}이면 닿아요."


def _suggest_radius(duration_mins: int) -> int:
    for threshold, radius in _SUGGEST_RADIUS_TABLE:
        if duration_mins <= threshold:
            return radius
    return _SUGGEST_RADIUS_TABLE[-1][1]


async def _suggest_search_nearby(
    lat: float, lng: float, radius_m: int
) -> list[dict[str, Any]]:
    params = {
        "MobileOS": _MOBILE_OS,
        "MobileApp": _MOBILE_APP,
        "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
        "mapX": str(lng),
        "mapY": str(lat),
        "radius": str(radius_m),
        "_type": "json",
        "numOfRows": "50",
        "arrange": "E",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{_KOR_SERVICE_URL}/locationBasedList2", params=params)
    return _extract_items(resp.json())


async def _suggest_fetch_intro(content_id: str, type_id: str) -> dict[str, Any]:
    params = {
        "MobileOS": _MOBILE_OS,
        "MobileApp": _MOBILE_APP,
        "serviceKey": tourism_settings.TOUR_SERVICE_KEY,
        "contentId": content_id,
        "contentTypeId": type_id,
        "_type": "json",
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"{_KOR_SERVICE_URL}/detailIntro2", params=params)
        items = _extract_items(resp.json())
        return items[0] if items else {}
    except Exception:
        return {}


async def get_plan_suggestions(itineraries: list[Itinerary]) -> list[DaySuggestion]:
    by_date: dict[date, list[Itinerary]] = {}
    for it in itineraries:
        by_date.setdefault(it.itinerary_date, []).append(it)

    existing_titles = {
        it.location.name.strip().lower()
        for it in itineraries
        if it.location and it.location.name
    }

    results: list[DaySuggestion] = []
    for day in sorted(by_date):
        suggestion = await _suggest_process_day(day, by_date[day], existing_titles)
        if suggestion:
            results.append(suggestion)
    return results


async def _suggest_process_day(
    day: date,
    day_its: list[Itinerary],
    existing_titles: set[str],
) -> DaySuggestion | None:
    slot = _suggest_find_slot(day_its)
    if not slot:
        return None

    radius_m = _suggest_radius(slot["duration"])

    raw_items = await _suggest_search_nearby(
        slot["center_lat"], slot["center_lng"], radius_m
    )
    if not raw_items:
        return None

    def _dist(item: dict[str, Any]) -> float:
        try:
            return float(item.get("dist") or 99999)
        except (ValueError, TypeError):
            return 99999

    candidates = [
        item
        for item in raw_items
        if str(item.get("contenttypeid") or "") not in _SUGGEST_EXCLUDE_TYPES
        and " ".join(str(item.get("title") or "").split()).strip().lower()
        not in existing_titles
    ]

    if not candidates:
        return None

    top = candidates[:15]
    intros = await asyncio.gather(
        *[
            _suggest_fetch_intro(
                str(c.get("contentid") or ""), str(c.get("contenttypeid") or "")
            )
            for c in top
        ]
    )
    pairs = list(zip(top, intros))
    open_pairs = [
        (c, intro)
        for c, intro in pairs
        if _suggest_is_open(
            intro, str(c.get("contenttypeid") or ""), slot["start"], slot["end"]
        )
    ] or pairs

    category_count: dict[str, int] = {}
    selected: list[SuggestionPlace] = []
    front = _suggest_front(slot)

    for item, intro in open_pairs:
        if len(selected) >= _SUGGEST_MAX_RESULTS:
            break
        type_id = str(item.get("contenttypeid") or "")
        category = _SUGGEST_CAT_LABELS.get(type_id)
        if category and category_count.get(category, 0) >= _SUGGEST_MAX_SAME_CAT:
            continue

        try:
            mapx = float(item["mapX"]) if item.get("mapX") else None
            mapy = float(item["mapY"]) if item.get("mapY") else None
        except (ValueError, TypeError):
            mapx = mapy = None

        d = _dist(item)
        back = _suggest_back(slot, d, intro, type_id, mapx, mapy)
        selected.append(
            SuggestionPlace(
                content_id=str(item.get("contentid") or ""),
                title=" ".join(str(item.get("title") or "").split()),
                category=category,
                dist=d if d < 99999 else None,
                image_url=str(item["firstimage"]) if item.get("firstimage") else None,
                mapx=mapx,
                mapy=mapy,
                sentence=f"{front} {back}",
            )
        )
        if category:
            category_count[category] = category_count.get(category, 0) + 1

    if not selected:
        return None

    return DaySuggestion(
        date=str(day),
        slot_start=_m2s(slot["start"]),
        slot_end=_m2s(slot["end"]),
        places=selected,
    )
