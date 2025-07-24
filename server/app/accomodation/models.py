# from datetime import date
# from typing import TYPE_CHECKING, Optional

# from sqlalchemy.orm import Mapped, mapped_column, relationship

# from app.models import Base


# class Accommodation(Base):
#     __tablename__ = "accommodation"

#     id: Mapped[int] = mapped_column(
#         primary_key=True,
#         init=False,
#         index=True,
#         autoincrement=True,
#     )

#     name: Mapped[str]
#     """숙소 이름"""

#     address: Mapped[str | None] = mapped_column(nullable=True)
#     """숙소 주소"""

#     start_date: Mapped[date]
#     """체크인 날짜"""

#     end_date: Mapped[date]
#     """체크아웃 날짜"""

#     price_per_night: Mapped[int]
#     """1박당 가격"""

#     total_price: Mapped[int]
#     """총 가격"""

#     plan_id: Mapped[int] = mapped_column(
#         Integer,
#         ForeignKey("plan.id"),
#         nullable=False,
#     )

#     plan: Mapped["Plan"] = relationship(back_populates="accommodations", init=False)
# #
