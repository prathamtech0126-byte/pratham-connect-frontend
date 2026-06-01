export const LEAD_DISTRIBUTION_STRATEGIES = [
  {
    value: "round_robin",
    label: "Round Robin",
    description:
      "Leads rotate equally in strict sequence across the selected team. Best when everyone should receive a fair, predictable share.",
  },
  {
    value: "least_loaded",
    label: "Least Loaded",
    description:
      "Each lead goes to the team member with the fewest leads assigned today. Best when workload balance matters more than fixed rotation.",
  },
  {
    value: "priority_weighted",
    label: "Priority Weighted",
    description:
      "Higher priority numbers receive more leads in each rotation. Best when senior or high-capacity members should get a larger share.",
  },
  {
    value: "performance_based",
    label: "Performance Based",
    description:
      "Uses round-robin rotation with performance weighting in mind. Best when you want even distribution while keeping performance tiers in the pool.",
  },
] as const;

export type LeadDistributionStrategy =
  (typeof LEAD_DISTRIBUTION_STRATEGIES)[number]["value"];
