import { addDays, differenceInCalendarDays, getDate, getMonth, startOfDay } from "date-fns";

export const FLEX_PLUS_RATE = 0.021; // 2.10% when balance >= threshold
export const FLEX_RATE = 0.02; // 2.00% standard rate below threshold
export const FLEX_PLUS_THRESHOLD = 10000; // SEK

export interface AccrualInput {
  principalBalance: number;
  accruedInterest: number;
  lastCalculatedDate: Date;
}

export interface AccrualResult {
  principalBalance: number;
  accruedInterest: number;
  lastCalculatedDate: Date;
}

/** Daily rate for a given balance, honouring the Flex Plus threshold. */
export function dailyRateFor(balance: number): number {
  const annual = balance >= FLEX_PLUS_THRESHOLD ? FLEX_PLUS_RATE : FLEX_RATE;
  return annual / 365;
}

/** The current annual rate (for display), based on the present balance. */
export function annualRateFor(balance: number): number {
  return balance >= FLEX_PLUS_THRESHOLD ? FLEX_PLUS_RATE : FLEX_RATE;
}

/**
 * Roll the account forward, accruing daily interest and capitalising accrued
 * interest into the principal on each Dec 31.
 *
 * Interest is only credited for *fully-completed* days: the current day's
 * interest is not counted until the following day, matching how the bank
 * accrues overnight and displays interest through yesterday. So we roll forward
 * up to and including yesterday, and `lastCalculatedDate` tracks that day.
 *
 * Dates are normalised to local midnight to avoid timezone drift. Calling it
 * again on the same day is a no-op.
 */
export function accrueSavings(account: AccrualInput, now: Date = new Date()): AccrualResult {
  let principalBalance = account.principalBalance;
  let accruedInterest = account.accruedInterest;

  const last = startOfDay(account.lastCalculatedDate);
  // Yesterday — the last day whose interest has fully accrued.
  const target = addDays(startOfDay(now), -1);
  const missingDays = differenceInCalendarDays(target, last);

  if (missingDays <= 0) {
    return { principalBalance, accruedInterest, lastCalculatedDate: last };
  }

  for (let i = 1; i <= missingDays; i++) {
    const day = addDays(last, i);

    // Year-end capitalisation happens before that day's accrual.
    if (getMonth(day) === 11 && getDate(day) === 31) {
      principalBalance += accruedInterest;
      accruedInterest = 0;
    }

    accruedInterest += principalBalance * dailyRateFor(principalBalance);
  }

  return { principalBalance, accruedInterest, lastCalculatedDate: target };
}
