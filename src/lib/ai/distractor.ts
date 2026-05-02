import { generateText } from "ai";
import { resolveModel } from "./models";

function extractJson(text: string): string {
  return text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
}

export async function generateDistractors(card: {
  front: string;
  back: string;
}): Promise<string[]> {
  const profile = resolveModel("fast");
  const { text } = await generateText({
    model: profile.model(),
    system:
      "You are a spaced-repetition study assistant. Generate plausible but clearly incorrect distractors for multiple-choice flashcard review.",
    prompt: [
      `Flashcard question: ${card.front}`,
      `Correct answer: ${card.back}`,
      "",
      "Generate exactly 3 plausible but incorrect distractors. Each should be similar in style and length to the correct answer but factually wrong.",
      'Return ONLY a JSON array of 3 strings, no explanation. Example: ["distractor 1", "distractor 2", "distractor 3"]',
    ].join("\n"),
    temperature: 0.7,
    maxOutputTokens: 300,
  });

  const parsed = JSON.parse(extractJson(text));
  if (!Array.isArray(parsed) || parsed.length !== 3) {
    throw new Error("Invalid distractor response from AI");
  }
  return parsed as string[];
}

export async function evaluateAnswer(card: {
  front: string;
  back: string;
  draft: string;
}): Promise<{ verdict: "correct" | "partial" | "wrong"; feedback: string }> {
  const profile = resolveModel("fast");
  const { text } = await generateText({
    model: profile.model(),
    system: "You are a precise study evaluator. Grade student answers honestly and concisely.",
    prompt: [
      `Question: ${card.front}`,
      `Correct answer: ${card.back}`,
      `Student's answer: ${card.draft}`,
      "",
      'Rate the student answer as "correct", "partial", or "wrong". Give one concise sentence of feedback.',
      'Return ONLY JSON: {"verdict": "correct"|"partial"|"wrong", "feedback": "..."}',
    ].join("\n"),
    temperature: 0.3,
    maxOutputTokens: 150,
  });

  const result = JSON.parse(extractJson(text));
  if (!["correct", "partial", "wrong"].includes(result.verdict)) {
    throw new Error("Invalid evaluation response from AI");
  }
  return {
    verdict: result.verdict as "correct" | "partial" | "wrong",
    feedback: String(result.feedback),
  };
}
