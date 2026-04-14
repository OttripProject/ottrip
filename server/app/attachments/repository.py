from sqlalchemy import delete, select

from app.database.deps import SessionDep
from app.utils.dependency import dependency

from .models import Attachment, AttachmentEntityType


@dependency
class AttachmentRepository:
    session: SessionDep

    async def save(self, *, attachment: Attachment) -> Attachment:
        self.session.add(attachment)
        await self.session.flush()
        await self.session.refresh(attachment)
        return attachment

    async def find_by_id(self, *, attachment_id: int) -> Attachment | None:
        return await self.session.get(Attachment, attachment_id)

    async def find_by_entity(
        self,
        *,
        entity_type: AttachmentEntityType,
        entity_id: int,
    ) -> list[Attachment]:
        result = await self.session.execute(
            select(Attachment)
            .where(
                Attachment.entity_type == entity_type,
                Attachment.entity_id == entity_id,
            )
            .order_by(Attachment.created_at.asc())
        )
        return list(result.scalars().all())

    async def find_by_plan(self, *, plan_id: int) -> list[Attachment]:
        result = await self.session.execute(
            select(Attachment)
            .where(Attachment.plan_id == plan_id)
            .order_by(Attachment.entity_type, Attachment.created_at.asc())
        )
        return list(result.scalars().all())

    async def find_by_key(self, *, file_key: str) -> Attachment | None:
        return await self.session.scalar(
            select(Attachment).where(Attachment.file_key == file_key)
        )

    async def remove(self, *, attachment_id: int) -> None:
        await self.session.execute(
            delete(Attachment).where(Attachment.id == attachment_id)
        )

    async def remove_by_entity(
        self,
        *,
        entity_type: AttachmentEntityType,
        entity_id: int,
    ) -> None:
        await self.session.execute(
            delete(Attachment).where(
                Attachment.entity_type == entity_type,
                Attachment.entity_id == entity_id,
            )
        )
