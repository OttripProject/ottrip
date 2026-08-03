from sqlalchemy import or_, select

from app.database.deps import SessionDep

from .models import City


async def search_cities(
    session: SessionDep,
    q: str | None,
    iso2: str | None,
    skip: int = 0,
    limit: int = 20,
) -> list[City]:
    stmt = select(City)
    if iso2:
        stmt = stmt.where(City.iso2 == iso2.upper())
    if q:
        stmt = stmt.where(
            or_(
                City.city_ko.ilike(f"%{q}%"),
                City.city_ascii.ilike(f"%{q}%"),
                City.city.ilike(f"%{q}%"),
            )
        )
    stmt = stmt.order_by(City.population.desc().nullslast()).offset(skip).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())
