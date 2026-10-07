/**
 * Financial guidance disclaimer text.
 *
 * Centralised so every surface uses identical wording. AfterBills provides
 * planning tools and illustrative projections — never regulated financial
 * advice. Components import the constants and render them via the shared
 * DisclaimerNotice / DisclaimerBlock components.
 */

export const MAIN_DISCLAIMER =
  'AfterBills provides financial information, planning tools and illustrative projections only. It does not provide financial advice or personal recommendations. You should consider your own circumstances and, where appropriate, seek advice from a suitably qualified professional before making financial decisions.';

export const INVESTMENT_DISCLAIMER =
  'The value of investments can go down as well as up, and you may get back less than you invest. Past performance and projected returns are not guarantees of future performance.';

export const OVERPAYMENT_DISCLAIMER =
  'Overpayment calculations are estimates. Check your lender\u2019s terms, early repayment charges and overpayment allowances before making changes.';

export const PENSION_DISCLAIMER =
  'Pension projections are illustrative and depend on assumptions such as contributions, fees, investment growth, inflation and retirement age. Actual outcomes may differ.';

/** Short labels for inline notices beside projections. */
export const SHORT_NOTICES = {
  illustrative: 'Illustrative only',
  notAdvice: 'Not financial advice',
  estimates: 'Estimates only',
};

/**
 * The full set of disclaimers shown on the dedicated Financial Disclaimer page,
 * grouped by topic so the page reads as a clear reference rather than a wall
 * of text.
 */
export const DISCLAIMER_SECTIONS = [
  {
    title: 'General',
    body: MAIN_DISCLAIMER,
  },
  {
    title: 'Investments & pensions',
    body: INVESTMENT_DISCLAIMER,
  },
  {
    title: 'Mortgage & debt overpayment',
    body: OVERPAYMENT_DISCLAIMER,
  },
  {
    title: 'Pension projections',
    body: PENSION_DISCLAIMER,
  },
];