export interface CaptionEscalationRules {
  level2SnoozeThreshold: number; // e.g. 1-2 snoozes
  level2OverdueMinutes: number;  // e.g. 30 minutes overdue
  level3SnoozeThreshold: number; // e.g. 3+ snoozes
  level3OverdueMinutes: number;  // e.g. 120 minutes (2 hours) overdue
  maxRecentIdsMemory: number;    // e.g. remember last 5 caption IDs
}

export const CAPTION_RULES: CaptionEscalationRules = {
  level2SnoozeThreshold: 1,
  level2OverdueMinutes: 30,
  level3SnoozeThreshold: 3,
  level3OverdueMinutes: 120,
  maxRecentIdsMemory: 5,
};
