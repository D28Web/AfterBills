/**
 * UK Tax & National Insurance estimation (2024/25 tax year)
 * Calculates estimated annual take-home from gross annual salary.
 * This is a simplified estimate — not financial advice.
 */

// Income Tax bands (England/Wales/NI)
const PERSONAL_ALLOWANCE = 12570;
const BASIC_RATE_LIMIT = 50270; // up to this = 20%
const HIGHER_RATE_LIMIT = 125140; // up to this = 40%
// Above 125140 = 45%

// Personal allowance tapers above 100k (£1 lost per £2 earned)
function getPersonalAllowance(grossAnnual) {
  if (grossAnnual <= 100000) return PERSONAL_ALLOWANCE;
  const reduction = Math.floor((grossAnnual - 100000) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

function calcIncomeTax(grossAnnual) {
  const pa = getPersonalAllowance(grossAnnual);
  const taxable = Math.max(0, grossAnnual - pa);

  let tax = 0;
  if (taxable > 0) {
    const basicBand = BASIC_RATE_LIMIT - pa;
    const basic = Math.min(taxable, basicBand);
    tax += basic * 0.20;

    if (taxable > basicBand) {
      const higher = Math.min(taxable - basicBand, HIGHER_RATE_LIMIT - BASIC_RATE_LIMIT);
      tax += higher * 0.40;
    }

    if (taxable > HIGHER_RATE_LIMIT - pa) {
      const additional = taxable - (HIGHER_RATE_LIMIT - pa);
      tax += additional * 0.45;
    }
  }
  return tax;
}

// National Insurance (Class 1, employee) 2024/25
// Primary threshold: £12,570/yr  Upper earnings limit: £50,270/yr
const NI_PRIMARY = 12570;
const NI_UPPER = 50270;

function calcNI(grossAnnual) {
  let ni = 0;
  if (grossAnnual > NI_PRIMARY) {
    const band1 = Math.min(grossAnnual, NI_UPPER) - NI_PRIMARY;
    ni += band1 * 0.08; // 8% main rate
  }
  if (grossAnnual > NI_UPPER) {
    ni += (grossAnnual - NI_UPPER) * 0.02; // 2% above upper limit
  }
  return ni;
}

/**
 * Returns estimated annual take-home pay after income tax & NI.
 */
export function ukTakeHome(grossAnnual) {
  const tax = calcIncomeTax(grossAnnual);
  const ni = calcNI(grossAnnual);
  return grossAnnual - tax - ni;
}

/**
 * Returns a breakdown for display purposes.
 */
export function ukTaxBreakdown(grossAnnual) {
  const tax = calcIncomeTax(grossAnnual);
  const ni = calcNI(grossAnnual);
  const takeHome = grossAnnual - tax - ni;
  return {
    grossAnnual,
    incomeTax: tax,
    nationalInsurance: ni,
    takeHomeAnnual: takeHome,
    takeHomeMonthly: takeHome / 12,
  };
}