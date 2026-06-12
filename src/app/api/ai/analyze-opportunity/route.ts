import { NextResponse } from "next/server";
import { createOpenAIClient, getOpenAIErrorCode, getOpenAIModel, isOpenAIConfigured } from "@/lib/openai/client";
import { buildLocalOpportunityAnalysis } from "@/lib/openai/fallback";
import { buildOpportunityAnalysisPrompt, type OpportunityAnalysisPromptInput } from "@/lib/openai/prompts";
import { parseJsonObject, validateOpportunityAnalysis } from "@/lib/openai/validation";

const MAX_RAW_TEXT_LENGTH = 6000;

export async function POST(request: Request) {
  let input: OpportunityAnalysisPromptInput;

  try {
    input = (await request.json()) as OpportunityAnalysisPromptInput;
  } catch (error) {
    console.error("AI analysis request parse error", error);
    return NextResponse.json({ error: "Cererea nu a putut fi citita." }, { status: 400 });
  }

  if (!input.business || !input.title || !input.rawText) {
    return NextResponse.json({ error: "Titlul, textul oportunității și businessul sunt obligatorii." }, { status: 400 });
  }

  const trimmedRawText = input.rawText.length > MAX_RAW_TEXT_LENGTH ? input.rawText.slice(0, MAX_RAW_TEXT_LENGTH) : input.rawText;
  const safeInput = { ...input, rawText: trimmedRawText };
  const warning = input.rawText.length > MAX_RAW_TEXT_LENGTH ? "Textul a fost scurtat pentru analiza AI." : null;

  if (!isOpenAIConfigured()) {
    return NextResponse.json({
      ...buildLocalOpportunityAnalysis(safeInput),
      warning,
      message: "OpenAI nu este configurat. Poti folosi analiza locala temporar."
    });
  }

  const client = createOpenAIClient();
  if (!client) {
    return NextResponse.json({
      ...buildLocalOpportunityAnalysis(safeInput),
      warning,
      message: "OpenAI nu este configurat. Poti folosi analiza locala temporar."
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Raspunzi doar cu JSON valid. Nu include markdown."
        },
        {
          role: "user",
          content: buildOpportunityAnalysisPrompt(safeInput)
        }
      ]
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error("OpenAI a returnat un raspuns gol.");
    }

    return NextResponse.json({
      ...validateOpportunityAnalysis(parseJsonObject(content), "ai"),
      warning
    });
  } catch (error) {
    console.error("OpenAI opportunity analysis error", error);
    if (getOpenAIErrorCode(error) === "insufficient_quota") {
      return NextResponse.json(
        {
          code: "insufficient_quota",
          error: "Credit insuficient în OpenAI API. Poți folosi analiza locală temporar.",
          canUseLocalFallback: true,
          warning
        },
        { status: 402 }
      );
    }

    const message = error instanceof Error && error.message.includes("validat")
      ? "Raspunsul AI nu a putut fi validat. Incearca din nou sau foloseste analiza locala."
      : "Analiza AI a esuat. Poti incerca din nou sau folosi analiza locala.";
    return NextResponse.json({ error: message, canUseLocalFallback: true, warning }, { status: 502 });
  }
}
