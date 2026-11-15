/** Subscription state rules shared by summaries, mapping and usage reviews. */
export const isLowUsageLevel = (level) => ["RARELY", "NEVER"].includes(level);
export const isBillableStatus = (status) => ["active", "review", "trial"].includes(status);
