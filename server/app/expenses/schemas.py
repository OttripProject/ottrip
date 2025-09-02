from app.schemas import APISchema


class ExpenseBase(APISchema):
    title: str
    amount: int


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseRead(ExpenseBase):
    id: int
