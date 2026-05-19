/**
 * Telecaller targets (set by admin/manager).
 * Monthly enrollment goal = leads converted/transferred to counsellor (or enrollments).
 */

export interface TelecallerTarget {
  userId: string;
  userName: string;
  /** Monthly enrollment goal - set by admin/manager */
  monthlyEnrollmentTarget: number;
}

export interface TelecallerAchieved {
  userId: string;
  /** Achieved this month (enrollments / transfers to counsellor) */
  monthlyEnrollmentAchieved: number;
}

/** Targets set by admin/manager */
export const DUMMY_TELECALLER_TARGETS: TelecallerTarget[] = [
  { userId: "6", userName: "Rahul Telecaller", monthlyEnrollmentTarget: 12 },
];

/** Current month achieved (dummy). Key by userId */
export const DUMMY_TELECALLER_ACHIEVED: Record<string, TelecallerAchieved> = {
  "6": { userId: "6", monthlyEnrollmentAchieved: 7 },
};

export function getTargetForUser(userId: string): TelecallerTarget | undefined {
  return DUMMY_TELECALLER_TARGETS.find((t) => t.userId === userId);
}

export function getAchievedForUser(userId: string): TelecallerAchieved {
  return DUMMY_TELECALLER_ACHIEVED[userId] ?? { userId, monthlyEnrollmentAchieved: 0 };
}
