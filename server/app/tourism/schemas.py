from app.schemas import APISchema


class CongestionItem(APISchema):
    tats_nm: str | None = None
    cnctr_rate: float | None = None
    base_ymd: str | None = None


class FestivalItem(APISchema):
    content_id: str
    content_type_id: str | None = None
    title: str
    address: str | None = None
    event_start_date: str | None = None
    event_end_date: str | None = None
    image_url: str | None = None
    image_url2: str | None = None
    lclsSystm2: str | None = None
    tel: str | None = None
    mapx: float | None = None
    mapy: float | None = None
    dist: float | None = None
    matched_location_name: str | None = None
    matched_date: str | None = None


class NearbyAttraction(APISchema):
    content_id: str
    content_type_id: str
    category_sub: str | None = None
    title: str
    image_url: str | None = None
    address: str | None = None
    rank: int | None = None
    dist: float | None = None


class TourismDetail(APISchema):
    content_id: str
    content_type_id: str | None = None
    title: str | None = None
    address: str | None = None
    homepage: str | None = None
    tel: str | None = None
    telname: str | None = None
    overview: str | None = None
    image_url: str | None = None
    mapx: float | None = None
    mapy: float | None = None
    # 관광지
    usetime: str | None = None
    restdate: str | None = None
    parking: str | None = None
    infocenter: str | None = None
    # 문화시설
    usetimeculture: str | None = None
    restdateculture: str | None = None
    usefee: str | None = None
    spendtime: str | None = None
    parkingculture: str | None = None
    # 축제·공연
    eventdate: str | None = None
    eventplace: str | None = None
    playtime: str | None = None
    usetimefestival: str | None = None
    bookingplace: str | None = None
    agelimit: str | None = None
    program: str | None = None
    sponsor1: str | None = None
    sponsor1tel: str | None = None
    sponsor2: str | None = None
    # 여행코스
    distance: str | None = None
    taketime: str | None = None
    schedule: str | None = None
    infocentertourcourse: str | None = None
    # 레포츠
    usetimeleports: str | None = None
    restdateleports: str | None = None
    usefeeleports: str | None = None
    reservation: str | None = None
    parkingleports: str | None = None
    # 숙박
    checkintime: str | None = None
    checkouttime: str | None = None
    roomcount: str | None = None
    reservationlodging: str | None = None
    refundregulation: str | None = None
    subfacility: str | None = None
    infocenterlodging: str | None = None
    parkinglodging: str | None = None
    # 쇼핑
    opentime: str | None = None
    restdateshopping: str | None = None
    saleitem: str | None = None
    parkingshopping: str | None = None
    # 음식점
    opentimefood: str | None = None
    restdatefood: str | None = None
    firstmenu: str | None = None
    packing: str | None = None
    reservationfood: str | None = None
    parkingfood: str | None = None
