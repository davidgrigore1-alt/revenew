import { NextResponse } from "next/server";
import { createOpenAIClient, getOpenAIErrorCode, getOpenAIModel, isOpenAIConfigured } from "@/lib/openai/client";
import { buildLocalGeneratedDocument } from "@/lib/openai/fallback";
import { buildDocumentGenerationPrompt, type DocumentGenerationPromptInput } from "@/lib/openai/prompts";
import { parseJsonObject, validateGeneratedDocument, documentTypes } from "@/lib/openai/validation";
import type { OpportunityDocumentType } from "@/lib/types";

export async function POST(request: Request) {
  let input: DocumentGenerationPromptInput;

  try {
    input = (await request.json()) as DocumentGenerationPromptInput;
  } catch (error) {
    console.error("AI document request parse error", error);
    return NextResponse.json({ error: "Cererea nu a putut fi citita." }, { status: 400 });
  }

  if (!documentTypes.includes(input.documentType as OpportunityDocumentType) || !input.business || !input.opportunity) {
    return NextResponse.json({ error: "Tipul documentului, businessul si oportunitatea sunt obligatorii." }, { status: 400 });
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({
      ...buildLocalGeneratedDocument(input.documentType, input.business, input.opportunity),
      message: "OpenAI nu este configurat. Documentul a fost generat local."
    });
  }

  const client = createOpenAIClient();
  if (!client) {
    return NextResponse.json({
      ...buildLocalGeneratedDocument(input.documentType, input.business, input.opportunity),
      message: "OpenAI nu este configurat. Documentul a fost generat local."
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: "Raspunzi doar cu JSON valid. Nu include markdown."
        },
        {
          role: "user",
          content: buildDocumentGenerationPrompt(input)
        }
      ]
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error("OpenAI a returnat un raspuns gol.");
    }

    return NextResponse.json(validateGeneratedDocument(parseJsonObject(content), "ai", input.documentType));
  } catch (error) {
    console.error("OpenAI document generation error", error);
    if (getOpenAIErrorCode(error) === "insufficient_quota") {
      return NextResponse.json(
        {
          code: "insufficient_quota",
          error: "Credit insuficient în OpenAI API. Documentul poate fi generat local temporar.",
          canUseLocalFallback: true
        },
        { status: 402 }
      );
    }

    const message = error instanceof Error && error.message.includes("validat")
      ? "Raspunsul AI nu a putut fi validat."
      : "Documentul nu a putut fi generat.";
    return NextResponse.json({ error: message, canUseLocalFallback: true }, { status: 502 });
  }
}
