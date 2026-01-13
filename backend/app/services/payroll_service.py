"""
Payroll Service - Business logic for payroll management
"""
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.payroll import (
    Employee,
    PayrollRun,
    PayrollItem,
    PayrollStatus,
)
from app.models.accounting import Expense, ExpenseCategory
from app.schemas.payroll import PayrollRunCreate, PayrollRunUpdate, PayrollItemUpdate
from app.services.employee_service import employee_service


class PayrollService:
    """Service for payroll operations"""

    # ============================================
    # Payroll Run CRUD
    # ============================================

    async def get_payroll_runs(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        status: PayrollStatus | None = None,
    ) -> list[PayrollRun]:
        """Get all payroll runs with optional status filter"""
        stmt = select(PayrollRun)

        if status is not None:
            stmt = stmt.where(PayrollRun.status == status)

        stmt = stmt.order_by(PayrollRun.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_payroll_run(
        self,
        db: AsyncSession,
        payroll_id: UUID,
    ) -> PayrollRun | None:
        """Get a single payroll run with items"""
        stmt = (
            select(PayrollRun)
            .options(
                selectinload(PayrollRun.items).selectinload(PayrollItem.employee)
            )
            .where(PayrollRun.id == payroll_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_payroll_run(
        self,
        db: AsyncSession,
        data: PayrollRunCreate,
        *,
        created_by: UUID | None = None,
    ) -> PayrollRun:
        """Create a new payroll run with items for all active employees"""
        # Validate dates
        if data.period_end < data.period_start:
            raise ValueError("La fecha de fin debe ser mayor o igual a la fecha de inicio")

        # Get employees (specific list or all active)
        if data.employee_ids:
            employees = []
            for emp_id in data.employee_ids:
                emp = await employee_service.get_employee(db, emp_id)
                if emp and emp.is_active:
                    employees.append(emp)
        else:
            employees = await employee_service.get_employees(db, is_active=True)

        if not employees:
            raise ValueError("No hay empleados activos para incluir en la nómina")

        # Create payroll run
        payroll_run = PayrollRun(
            period_start=data.period_start,
            period_end=data.period_end,
            payment_date=data.payment_date,
            notes=data.notes,
            status=PayrollStatus.DRAFT,
            created_by=created_by,
            employee_count=len(employees),
        )
        db.add(payroll_run)
        await db.flush()  # Get the ID

        # Create items for each employee
        total_base = Decimal("0")
        total_bonuses = Decimal("0")
        total_deductions = Decimal("0")
        total_net = Decimal("0")

        for employee in employees:
            # Calculate employee totals
            totals = await employee_service.calculate_employee_totals(
                db, employee.id, data.period_end
            )

            item = PayrollItem(
                payroll_run_id=payroll_run.id,
                employee_id=employee.id,
                base_salary=totals["base_salary"],
                total_bonuses=totals["total_bonuses"],
                total_deductions=totals["total_deductions"],
                net_amount=totals["net_amount"],
                bonus_breakdown=totals["bonus_breakdown"],
                deduction_breakdown=totals["deduction_breakdown"],
            )
            db.add(item)

            total_base += totals["base_salary"]
            total_bonuses += totals["total_bonuses"]
            total_deductions += totals["total_deductions"]
            total_net += totals["net_amount"]

        # Update payroll run totals
        payroll_run.total_base_salary = total_base
        payroll_run.total_bonuses = total_bonuses
        payroll_run.total_deductions = total_deductions
        payroll_run.total_net = total_net

        await db.commit()
        await db.refresh(payroll_run)
        return payroll_run

    async def update_payroll_run(
        self,
        db: AsyncSession,
        payroll_id: UUID,
        data: PayrollRunUpdate,
    ) -> PayrollRun:
        """Update a payroll run (only if in draft status)"""
        payroll = await self.get_payroll_run(db, payroll_id)
        if not payroll:
            raise ValueError("Liquidación de nómina no encontrada")

        if payroll.status != PayrollStatus.DRAFT:
            raise ValueError("Solo se pueden editar liquidaciones en estado borrador")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(payroll, field, value)

        await db.commit()
        await db.refresh(payroll)
        return payroll

    async def approve_payroll_run(
        self,
        db: AsyncSession,
        payroll_id: UUID,
        *,
        approved_by: UUID | None = None,
    ) -> PayrollRun:
        """Approve a payroll run and create expense"""
        payroll = await self.get_payroll_run(db, payroll_id)
        if not payroll:
            raise ValueError("Liquidación de nómina no encontrada")

        if payroll.status != PayrollStatus.DRAFT:
            raise ValueError("Solo se pueden aprobar liquidaciones en estado borrador")

        # Create expense for payroll
        expense = Expense(
            category=ExpenseCategory.PAYROLL,
            description=f"Nómina {payroll.period_start.strftime('%d/%m/%Y')} - {payroll.period_end.strftime('%d/%m/%Y')}",
            amount=payroll.total_net,
            expense_date=payroll.payment_date or date.today(),
            vendor="Nómina de empleados",
            is_paid=False,
            created_by=approved_by,
        )
        db.add(expense)
        await db.flush()

        # Update payroll status
        payroll.status = PayrollStatus.APPROVED
        payroll.expense_id = expense.id
        payroll.approved_by = approved_by
        payroll.approved_at = datetime.utcnow()

        await db.commit()
        await db.refresh(payroll)
        return payroll

    async def mark_payroll_paid(
        self,
        db: AsyncSession,
        payroll_id: UUID,
    ) -> PayrollRun:
        """Mark entire payroll as paid"""
        payroll = await self.get_payroll_run(db, payroll_id)
        if not payroll:
            raise ValueError("Liquidación de nómina no encontrada")

        if payroll.status != PayrollStatus.APPROVED:
            raise ValueError("Solo se pueden pagar liquidaciones aprobadas")

        # Mark all items as paid
        for item in payroll.items:
            if not item.is_paid:
                item.is_paid = True
                item.paid_at = datetime.utcnow()

        payroll.status = PayrollStatus.PAID
        payroll.paid_at = datetime.utcnow()

        await db.commit()
        await db.refresh(payroll)
        return payroll

    async def cancel_payroll_run(
        self,
        db: AsyncSession,
        payroll_id: UUID,
    ) -> PayrollRun:
        """Cancel a payroll run"""
        payroll = await self.get_payroll_run(db, payroll_id)
        if not payroll:
            raise ValueError("Liquidación de nómina no encontrada")

        if payroll.status == PayrollStatus.PAID:
            raise ValueError("No se pueden cancelar liquidaciones ya pagadas")

        payroll.status = PayrollStatus.CANCELLED

        # Also cancel the associated expense if exists
        if payroll.expense_id:
            stmt = select(Expense).where(Expense.id == payroll.expense_id)
            result = await db.execute(stmt)
            expense = result.scalar_one_or_none()
            if expense and not expense.is_paid:
                # Mark expense as cancelled by setting amount to 0 or deleting
                # For now, we'll just leave it as is but disconnected
                payroll.expense_id = None

        await db.commit()
        await db.refresh(payroll)
        return payroll

    # ============================================
    # Payroll Item Operations
    # ============================================

    async def get_payroll_item(
        self,
        db: AsyncSession,
        item_id: UUID,
    ) -> PayrollItem | None:
        """Get a single payroll item"""
        stmt = (
            select(PayrollItem)
            .options(selectinload(PayrollItem.employee))
            .where(PayrollItem.id == item_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_payroll_item(
        self,
        db: AsyncSession,
        item_id: UUID,
        data: PayrollItemUpdate,
    ) -> PayrollItem:
        """Update a payroll item (only if payroll is in draft)"""
        item = await self.get_payroll_item(db, item_id)
        if not item:
            raise ValueError("Item de nómina no encontrado")

        # Check payroll status
        payroll = await self.get_payroll_run(db, item.payroll_run_id)
        if payroll.status != PayrollStatus.DRAFT:
            raise ValueError("Solo se pueden editar items de liquidaciones en borrador")

        update_data = data.model_dump(exclude_unset=True)

        # Recalculate totals if breakdowns changed
        if "bonus_breakdown" in update_data:
            bonus_list = update_data["bonus_breakdown"] or []
            item.bonus_breakdown = [{"name": b.name, "amount": float(b.amount)} for b in bonus_list]
            item.total_bonuses = sum(Decimal(str(b.amount)) for b in bonus_list)

        if "deduction_breakdown" in update_data:
            ded_list = update_data["deduction_breakdown"] or []
            item.deduction_breakdown = [{"name": d.name, "amount": float(d.amount)} for d in ded_list]
            item.total_deductions = sum(Decimal(str(d.amount)) for d in ded_list)

        if "base_salary" in update_data:
            item.base_salary = update_data["base_salary"]

        # Recalculate net
        item.net_amount = item.base_salary + item.total_bonuses - item.total_deductions

        # Recalculate payroll totals
        await self._recalculate_payroll_totals(db, payroll)

        await db.commit()
        await db.refresh(item)
        return item

    async def pay_payroll_item(
        self,
        db: AsyncSession,
        item_id: UUID,
        payment_method: str,
        payment_reference: str | None = None,
    ) -> PayrollItem:
        """Pay a single payroll item"""
        item = await self.get_payroll_item(db, item_id)
        if not item:
            raise ValueError("Item de nómina no encontrado")

        # Check payroll status
        payroll = await self.get_payroll_run(db, item.payroll_run_id)
        if payroll.status not in [PayrollStatus.APPROVED, PayrollStatus.PAID]:
            raise ValueError("Solo se pueden pagar items de liquidaciones aprobadas")

        if item.is_paid:
            raise ValueError("Este item ya fue pagado")

        item.is_paid = True
        item.paid_at = datetime.utcnow()
        item.payment_method = payment_method
        item.payment_reference = payment_reference

        # Check if all items are paid
        all_paid = all(i.is_paid for i in payroll.items)
        if all_paid:
            payroll.status = PayrollStatus.PAID
            payroll.paid_at = datetime.utcnow()

        await db.commit()
        await db.refresh(item)
        return item

    # ============================================
    # Helper Methods
    # ============================================

    async def _recalculate_payroll_totals(
        self,
        db: AsyncSession,
        payroll: PayrollRun,
    ) -> None:
        """Recalculate payroll run totals from items"""
        total_base = Decimal("0")
        total_bonuses = Decimal("0")
        total_deductions = Decimal("0")
        total_net = Decimal("0")

        for item in payroll.items:
            total_base += item.base_salary
            total_bonuses += item.total_bonuses
            total_deductions += item.total_deductions
            total_net += item.net_amount

        payroll.total_base_salary = total_base
        payroll.total_bonuses = total_bonuses
        payroll.total_deductions = total_deductions
        payroll.total_net = total_net

    async def get_payroll_summary(
        self,
        db: AsyncSession,
    ) -> dict:
        """Get summary of payroll data"""
        # Count active employees
        employees = await employee_service.get_employees(db, is_active=True)

        # Calculate monthly payroll estimate
        total_monthly = Decimal("0")
        for emp in employees:
            totals = await employee_service.calculate_employee_totals(db, emp.id)
            total_monthly += totals["net_amount"]

        # Count pending payroll runs
        pending_stmt = select(PayrollRun).where(
            PayrollRun.status.in_([PayrollStatus.DRAFT, PayrollStatus.APPROVED])
        )
        pending_result = await db.execute(pending_stmt)
        pending_runs = list(pending_result.scalars().all())

        # Get last paid payroll date
        last_paid_stmt = (
            select(PayrollRun)
            .where(PayrollRun.status == PayrollStatus.PAID)
            .order_by(PayrollRun.paid_at.desc())
            .limit(1)
        )
        last_paid_result = await db.execute(last_paid_stmt)
        last_paid = last_paid_result.scalar_one_or_none()

        return {
            "active_employees": len(employees),
            "total_monthly_payroll": total_monthly,
            "pending_payroll_runs": len(pending_runs),
            "last_payroll_date": last_paid.period_end if last_paid else None,
        }


# Create singleton instance
payroll_service = PayrollService()
