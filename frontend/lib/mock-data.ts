export interface Grant {
  id: string;
  title: string;
  provider: string;
  maxFunding: number; // in SGD
  deadline: string; // ISO date string for serialization safety
  deadlineDate: Date; // For calculation
  matchScore: number; // 0-100
  aiInsight: string;
  tags: string[];
  type: "IPC" | "CLG" | "Society" | "Any"; // Organization type eligibility
}

export const MOCK_GRANTS: Grant[] = [
  {
    id: "g1",
    title: "Arts Creation Fund",
    provider: "National Arts Council",
    maxFunding: 50000,
    deadline: "2026-03-31",
    deadlineDate: new Date("2026-03-31"),
    matchScore: 92,
    aiInsight: "Strong fit for arts engagement. Your focus on elderly community arts aligns perfectly with the 'Community Engagement' priority.",
    tags: ["Arts", "Community", "Elderly"],
    type: "Any"
  },
  {
    id: "g2",
    title: "Community Healthcare Fund",
    provider: "Tote Board",
    maxFunding: 100000,
    deadline: "2026-04-15",
    deadlineDate: new Date("2026-04-15"),
    matchScore: 85,
    aiInsight: "Good potential. While primarily for healthcare, your mental wellness angle for youths is a qualifying sub-category.",
    tags: ["Health", "Youth", "Mental Wellness"],
    type: "IPC"
  },
  {
    id: "g3",
    title: "SG Eco Fund",
    provider: "Ministry of Sustainability and the Environment",
    maxFunding: 1000000,
    deadline: "2026-06-30",
    deadlineDate: new Date("2026-06-30"),
    matchScore: 45,
    aiInsight: "Low alignment. This grant requires a strong environmental sustainability component which is missing from your proposal.",
    tags: ["Environment", "Sustainability", "Community"],
    type: "Any"
  },
  {
    id: "g4",
    title: "ICT for Social Good Grant",
    provider: "NVPC",
    maxFunding: 75000,
    deadline: "2026-02-28",
    deadlineDate: new Date("2026-02-28"),
    matchScore: 78,
    aiInsight: "Moderate fit. Supports the digital platform aspect of your project, but requires 30% co-funding.",
    tags: ["Tech", "Digitalization", "Social Good"],
    type: "CLG"
  },
  {
    id: "g5",
    title: "Youth Action Challenge",
    provider: "National Youth Council",
    maxFunding: 30000,
    deadline: "2026-05-10",
    deadlineDate: new Date("2026-05-10"),
    matchScore: 88,
    aiInsight: "Great match! Target audience (15-35 y/o) and social innovation theme are exact matches.",
    tags: ["Youth", "Social Enterprise", "Innovation"],
    type: "Society"
  }
];
