/**
 * UK Tax & National Insurance estimation
 * Dynamically selects the correct tax year based on the current date.
 * All figures are estimates — not financial advice.
 */

import { roundMoney } from './money';

// ─── Tax Year Configurations ────────────────────────────────────────────────
// Add a new entry each April to keep rules current.
const TAX_YEARS = {
  '2024/25': {
    label: '2024/25',
    personalAllowance: 12570,
    basicRateLimit: 50270,   // 20% up to here
    higherRateLimit: 125140, // 40% up to here, 45% above
    taperingThreshold: 100000,
    incomeTaxRates: { basic: 0.20, higher: 0.40, additional: 0.45 },
    niPrimaryThreshold: 12570,
    niUpperEarningsLimit: 50270,
    niRates: { main: 0.08, upper: 0.02 },
    studentLoan: {
      plan1: { threshold: 24990, rate: 0.09 },
      plan2: { threshold: 27295, rate: 0.09 },
      plan4: { threshold: 31395, rate: 0.09 },
      plan5: { threshold: 25000, rate: 0.09 },
      postgrad: { threshold: 21000, rate: 0.06 },
    },
  },
  '2025/26': {
    label: '2025/26',
    personalAllowance: 12570,
    basicRateLimit: 50270,
    higherRateLimit: 125140,
    taperingThreshold: 100000,
    incomeTaxRates: { basic: 0.20, higher: 0.40, additional: 0.45 },
    niPrimaryThreshold: 12570,
    niUpperEarningsLimit: 50270,
    niRates: { main: 0.08, upper: 0.02 },
    studentLoan: {
      plan1: { threshold: 26065, rate: 0.09 },
      plan2: { threshold: 28470, rate: 0.09 },
      plan4: { threshold: 32745, rate: 0.09 },
      plan5: { threshold: 25000, rate: 0.09 },
      postgrad: { threshold: 21000, rate: 0.06 },
    },
  },
};

/** Returns the active tax year key based on today's date (tax year runs Apr 6 → Apr 5). */
function getCurrentTaxYearKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  const day = now.getDate();
  // Before 6 April → previous tax year
  const taxStartYear = (month < 4 || (month === 4 && day < 6)) ? year - 1 : year;
  const key = `${taxStartYear}/${String(taxStartYear + 1).slice(-2)}`;
  // Fall back to most recent known year if we don't have this year yet
  return TAX_YEARS[key] ? key : Object.keys(TAX_YEARS).at(-1);
}

export function getCurrentTaxYear() {
  return TAX_YEARS[getCurrentTaxYearKey()];
}

// ─── Tax Code Parsing ────────────────────────────────────────────────────────
/**
 * Derive the effective personal allowance from a tax code.
 * Supports L codes (e.g. 1257L), BR, D0, D1, NT, K codes.
 */
export function allowanceFromTaxCode(taxCode, grossAnnual, txYear) {
  const config = txYear || getCurrentTaxYear();
  const code = (taxCode || '1257L').toUpperCase().trim();

  if (code === 'BR') return 0;
  if (code === 'D0' || code === 'D1') return 0;
  if (code === 'NT') return grossAnnual; // no tax
  if (code === '0T') return 0;

  // K code: reduces allowance (prefix K means negative allowance)
  if (code.startsWith('K')) {
    const num = parseInt(code.slice(1)) || 0;
    return -(num * 10); // negative — adds to taxable income
  }

  // L / M / N codes: number × 10 = personal allowance
  const match = code.match(/^(\d+)[LMNTW]?$/);
  if (match) {
    const stated = parseInt(match[1]) * 10;
    // Taper above 100k (standard taper, ignoring code adjustments for simplicity)
    if (grossAnnual > config.taperingThreshold) {
      const reduction = Math.floor((grossAnnual - config.taperingThreshold) / 2);
      return Math.max(0, stated - reduction);
    }
    return stated;
  }

  // Default to standard personal allowance with taper
  const pa = config.personalAllowance;
  if (grossAnnual > config.taperingThreshold) {
    const reduction = Math.floor((grossAnnual - config.taperingThreshold) / 2);
    return Math.max(0, pa - reduction);
  }
  return pa;
}

// ─── Core Calculation ────────────────────────────────────────────────────────
/**
 * Full UK tax breakdown.
 * @param {object} opts
 * @param {number} opts.grossAnnual          - Gross annual salary
 * @param {string} [opts.taxCode]            - Tax code (default '1257L')
 * @param {string} [opts.studentLoanPlan]    - 'none'|'plan1'|'plan2'|'plan4'|'plan5'|'postgrad'
 * @param {'percent'|'fixed'} [opts.pensionType] - How pension is specified
 * @param {number} [opts.pensionValue]       - Percentage (0–100) or fixed annual amount
 * @param {boolean} [opts.pensionIsSalarySacrifice] - Whether the pension is paid via salary sacrifice (reduces NI too)
 * @param {number} [opts.salarySacrificeAnnual] - Annual salary sacrifice amount
 * @param {number} [opts.otherDeductionsAnnual] - Other annual deductions (post-tax)
 * @param {string} [opts.taxYearKey]         - Override tax year key
 */
export function ukTaxBreakdown({
  grossAnnual,
  taxCode = '1257L',
  studentLoanPlan = 'none',
  pensionType = 'percent',
  pensionValue = 0,
  pensionIsSalarySacrifice = false,
  salarySacrificeAnnual = 0,
  otherDeductionsAnnual = 0,
  taxYearKey,
} = {}) {
  const config = taxYearKey ? TAX_YEARS[taxYearKey] : getCurrentTaxYear();
  const gross = grossAnnual || 0;

  // 1. Salary sacrifice reduces gross for tax & NI purposes
  const sacrifice = Math.max(0, Math.min(salarySacrificeAnnual || 0, gross));
  const postSacrificeGross = gross - sacrifice;

  // 2. Pension deduction (reduces taxable income if relief-at-source or net-pay)
  let pensionAnnual = 0;
  if (pensionType === 'percent') {
    pensionAnnual = postSacrificeGross * (Math.max(0, Math.min(100, pensionValue || 0)) / 100);
  } else {
    pensionAnnual = Math.max(0, Math.min(pensionValue || 0, postSacrificeGross));
  }

  // 3. Income Tax
  const taxableForIT = Math.max(0, postSacrificeGross - pensionAnnual);
  const pa = allowanceFromTaxCode(taxCode, taxableForIT, config);
  const effectiveAllowance = pa >= 0 ? pa : 0;
  const kAddition = pa < 0 ? Math.abs(pa) : 0;
  const taxableIncome = Math.max(0, taxableForIT - effectiveAllowance + kAddition);

  let incomeTax = 0;
  const { basic, higher, additional } = config.incomeTaxRates;
  const basicBand = config.basicRateLimit - Math.max(0, pa);
  if (taxableIncome > 0) {
    const basicAmt = Math.min(taxableIncome, basicBand);
    incomeTax += basicAmt * basic;
    if (taxableIncome > basicBand) {
      const higherBand = config.higherRateLimit - config.basicRateLimit;
      const higherAmt = Math.min(taxableIncome - basicBand, higherBand);
      incomeTax += higherAmt * higher;
      if (taxableIncome > basicBand + higherBand) {
        incomeTax += (taxableIncome - basicBand - higherBand) * additional;
      }
    }
  }

  // 4. National Insurance (salary sacrifice reduces NI; a salary-sacrifice pension also reduces NI,
  //    whereas a relief-at-source / net-pay pension typically does not)
  const niGross = pensionIsSalarySacrifice ? Math.max(0, postSacrificeGross - pensionAnnual) : postSacrificeGross;
  let nationalInsurance = 0;
  const { main: niMain, upper: niUpper } = config.niRates;
  if (niGross > config.niPrimaryThreshold) {
    const band1 = Math.min(niGross, config.niUpperEarningsLimit) - config.niPrimaryThreshold;
    nationalInsurance += band1 * niMain;
  }
  if (niGross > config.niUpperEarningsLimit) {
    nationalInsurance += (niGross - config.niUpperEarningsLimit) * niUpper;
  }

  // 5. Student loan
  let studentLoanDeduction = 0;
  if (studentLoanPlan && studentLoanPlan !== 'none') {
    const slConfig = config.studentLoan[studentLoanPlan];
    if (slConfig && gross > slConfig.threshold) {
      studentLoanDeduction = (gross - slConfig.threshold) * slConfig.rate;
    }
  }

  // 6. Net take-home
  const takeHomeAnnual = gross - incomeTax - nationalInsurance - pensionAnnual - sacrifice - studentLoanDeduction - (otherDeductionsAnnual || 0);

  return {
    taxYearLabel: config.label,
    grossAnnual: roundMoney(gross),
    salarySacrifice: roundMoney(sacrifice),
    pensionDeduction: roundMoney(pensionAnnual),
    pensionIsSalarySacrifice: !!pensionIsSalarySacrifice,
    incomeTax: roundMoney(Math.max(0, incomeTax)),
    nationalInsurance: roundMoney(Math.max(0, nationalInsurance)),
    studentLoanDeduction: roundMoney(Math.max(0, studentLoanDeduction)),
    otherDeductions: roundMoney(otherDeductionsAnnual || 0),
    takeHomeAnnual: roundMoney(Math.max(0, takeHomeAnnual)),
    takeHomeMonthly: roundMoney(Math.max(0, takeHomeAnnual) / 12),
  };
}

// ─── Legacy compat shim ──────────────────────────────────────────────────────
/** Simple gross → net (no extras). Used by older code paths. */
export function ukTakeHome(grossAnnual) {
  return ukTaxBreakdown({ grossAnnual }).takeHomeAnnual;
}