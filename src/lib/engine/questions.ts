import type { Brief } from "@/lib/brief/schema";
import {
  CLARITY_LEVELS,
  PERSONAL_IMPACT_LEVELS,
} from "./schema";

export function buildQuestions(brief: Brief) {
  const drivingCriteria: Record<string, string> = {};
  for (const provision of brief.provisions) {
    drivingCriteria[provision.id] = provision.summary;
  }

  return {
    stance: {
      type: "choice" as const,
      instructions:
        "What is this resident's overall position on the announcement?",
      criteria: {
        supportive:
          "welcomes the change and expects to comply or benefit",
        opposed: "rejects the change and sees it as harmful or unfair",
        confused: "does not understand what it means for them",
        indifferent: "does not think it affects them",
        anxious:
          "worried about consequences but not yet opposed",
      },
    },
    personal_impact: {
      type: "score" as const,
      instructions:
        "How much better or worse off does this resident expect to be because of the announcement?",
      criteria: [...PERSONAL_IMPACT_LEVELS],
    },
    clarity: {
      type: "score" as const,
      instructions:
        "How well does this resident understand what the announcement changes for them personally?",
      criteria: [...CLARITY_LEVELS],
    },
    top_concern: {
      type: "choice" as const,
      instructions:
        "Which single issue does this resident care most about in relation to the announcement?",
      criteria: {
        cost_of_living: "prices, tax, food, fuel, or household costs",
        land: "land ownership, title, or displacement",
        jobs: "wages, employment, or livelihoods",
        health_access: "clinics, insurance, or treatment costs",
        security: "safety, policing, or conflict",
        water_grazing: "water, pasture, or livestock movement",
        education: "schools, fees, or student life",
        movement: "travel, roads, or checkpoints",
        none: "no particular issue stands out",
      },
    },
    trusted_channel: {
      type: "choice" as const,
      instructions:
        "Through which medium is this resident most likely to receive and believe information about this announcement?",
      criteria: {
        radio: "radio",
        sms: "SMS",
        whatsapp: "messaging apps such as WhatsApp",
        baraza: "chief's or community meeting",
        religious: "church or mosque",
        tv: "television",
        social_media: "social media",
        none: "no trusted channel stands out",
      },
    },
    will_seek_info: {
      type: "boolean" as const,
      instructions:
        "Would this resident actively look for more information about this announcement?",
      criteria: {
        true: "would actively look for more information about this",
        false: "would not look for more information",
      },
    },
    misinfo_susceptible: {
      type: "boolean" as const,
      instructions:
        "Is this resident likely to believe and pass on an inaccurate version of this announcement?",
      criteria: {
        true: "likely to believe and pass on an inaccurate version of this announcement",
        false: "unlikely to spread an inaccurate version",
      },
    },
    mobilization: {
      type: "boolean" as const,
      instructions:
        "Would this resident join collective action such as a petition, boycott or demonstration?",
      criteria: {
        true: "would join collective action such as a petition, boycott or demonstration",
        false: "would not join collective action",
      },
    },
    driving_provision: {
      type: "choice" as const,
      instructions:
        "Which single provision most determines this resident's reaction?",
      criteria: drivingCriteria,
    },
  };
}

export type ReactionQuestions = ReturnType<typeof buildQuestions>;
