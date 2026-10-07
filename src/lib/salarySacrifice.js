/**
 * Salary sacrifice helpers.
 *
 * Salary sacrifice bills are pre-tax deductions. They are NOT subtracted
 * from take-home income in forecasts — in salary (gross) mode they're
 * already in the tax calculation; in net mode they're already deducted
 * by the employer. These helpers separate them from regular bills.
 */
import { billToMonthlyCost } from './forecast';
import { roundMoney, sumMoney } from './money';

export function isSalarySacrifice(bill) {
  return bill?.is_salary_sacrifice === true;
}

export function getSalarySacrificeBills(bills = []) {
  return (bills || []).filter(isSalarySacrifice);
}

export function getRegularBills(bills = []) {
  return (bills || []).filter(b => !isSalarySacrifice(b));
}

export function getMonthlySalarySacrifice(bills = []) {
  return roundMoney(sumMoney(getSalarySacrificeBills(bills).map(b => billToMonthlyCost(b))));
}