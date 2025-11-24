import { signedStructuredResponse } from '../structured-json.js';

export const MULTI_SELF_GENIUS_AGENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    // 1. Frame: what this run is about
    agentFrame: {
      type: "object",
      additionalProperties: false,
      properties: {
        agentName: { type: "string" },
        agentVersion: { type: "string" },
        runId: { type: "string" }, // e.g. uuid
        topic: {
          type: "string",
          description: "The main question or problem being discussed."
        },
        objective: {
          type: "string",
          description: "What the agent is trying to accomplish in this run."
        },
        reasoningStyle: {
          type: "string",
          description:
            "Summary of how the agent will reason (e.g., 'Socratic, rigorous, friendly')."
        }
      },
      required: ["agentName", "agentVersion", "runId", "topic", "objective"]
    },

    // 2. Participants: clones of the same genius with slightly different lenses
    participants: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
            description: "Local identifier for this sub-agent (e.g. 'A', 'B')."
          },
          displayName: {
            type: "string",
            description: "Human-friendly name (e.g. 'Analytical Genius A')."
          },
          role: {
            type: "string",
            description:
              "Role or stance, e.g. 'optimist', 'skeptic', 'systems-thinker'."
          },
          goals: {
            type: "array",
            items: { type: "string" },
            description:
              "Specific goals this participant will optimize during deliberation."
          }
        },
        required: ["id", "displayName", "role"]
      }
    },

    // 3. Deliberation trace: the inner conversation
    deliberationSteps: {
      type: "array",
      description:
        "Ordered multi-party reasoning trace as if multiple geniuses are debating.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          stepIndex: { type: "integer", minimum: 0 },
          speakerId: {
            type: "string",
            description: "Must match one of participants[].id"
          },
          messageType: {
            type: "string",
            enum: ["proposal", "critique", "refinement", "meta"],
            description:
              "What kind of contribution this is: new idea, critique, refinement, or meta-comment."
          },
          content: {
            type: "string",
            description: "Natural language content of this step."
          },
          reasoningNotes: {
            type: "string",
            description:
              "Optional explicit chain-of-thought style notes (can be brief/high-level)."
          },
          refersToStep: {
            type: ["integer", "null"],
            description:
              "If this step responds to or critiques a previous step, its index; otherwise null."
          },
          keyPoints: {
            type: "array",
            description: "Bullet-point summary of this step’s main ideas.",
            items: { type: "string" }
          }
        },
        required: ["stepIndex", "speakerId", "messageType", "content"]
      }
    },

    // 4. Final synthesis: where the “one mind” comes back together
    synthesis: {
      type: "object",
      additionalProperties: false,
      properties: {
        finalAnswer: {
          type: "string",
          description:
            "Unified, best-possible answer after the internal debate."
        },
        reasoningSummary: {
          type: "string",
          description:
            "Summary of how the participants converged on this answer."
        },
        pointsOfAgreement: {
          type: "array",
          items: { type: "string" },
          description: "Key points most or all participants agreed on."
        },
        pointsOfDisagreement: {
          type: "array",
          items: { type: "string" },
          description: "Important disagreements or open controversies."
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "Agent's overall confidence in the finalAnswer (0.0–1.0)."
        },
        remainingQuestions: {
          type: "array",
          items: { type: "string" },
          description:
            "Follow-up questions that remain unsolved or would be valuable to explore."
        }
      },
      required: ["finalAnswer", "reasoningSummary", "confidence"]
    },

    // 5. Control info for iterative self-dialogue
    control: {
      type: "object",
      additionalProperties: false,
      properties: {
        shouldIterate: {
          type: "boolean",
          description:
            "Whether the agent thinks another internal deliberation round would be useful."
        },
        suggestedNextIterationFocus: {
          type: "string",
          description:
            "If shouldIterate is true, what the next round should focus on."
        },
        suggestedNumParticipantsNextRound: {
          type: "integer",
          minimum: 2,
          description:
            "How many sub-agents (clones) the agent suggests for the next round."
        }
      },
      required: ["shouldIterate"]
    }
  },

  required: ["agentFrame", "participants", "deliberationSteps", "synthesis", "control"]
};
class MultiGeniusAgent {
  constructor() {
    // Initialize any necessary properties
  }

  /**
   * Run the multi-genius agent to deliberate on a topic
   * @param {string} userMessage - The main question or problem to deliberate on
   * @param {Object|Array|null} context - Optional additional context
   */
  async deliberate(userMessage, context = null) {
    const response = await signedStructuredResponse(
      {
        query: userMessage,
        schema: MULTI_SELF_GENIUS_AGENT_SCHEMA,
        context
      }
    );
    return response;
  }
}

export { MultiGeniusAgent };