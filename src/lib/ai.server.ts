// Server-only helpers for Lovable AI Gateway (Responses API, streamed, structured output).
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import type { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export async function generateStructured<T extends z.ZodTypeAny>(schema: T, instructions: string, prompt: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("A integração de IA de texto não está configurada (LOVABLE_API_KEY ausente).", 401);
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions,
      prompt,
      output: Output.object({ schema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    return (await result.output) as z.infer<T>;
  } catch (e) {
    const err = e as { statusCode?: number; message?: string; cause?: { statusCode?: number } };
    const status = err.statusCode ?? err.cause?.statusCode;
    if (status === 402) throw new AiError("Créditos de IA esgotados. Adicione créditos no workspace para continuar.", 402);
    if (status === 429) throw new AiError("Limite de requisições de IA atingido. Tente novamente em alguns minutos.", 429);
    if (status === 403) throw new AiError("Acesso ao modelo de IA bloqueado pelas configurações do workspace.", 403);
    console.error(e);
    throw new AiError("A IA não conseguiu gerar uma resposta válida. Tente novamente.", status);
  }
}

/** Generate a real image through the project's Lovable AI Gateway.
 * Executed only on the server and only after explicit user confirmation.
 */
export async function generateCarouselImagePng(prompt: string): Promise<{ bytes: Uint8Array; mediaType: string }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("A geração de imagens com IA precisa de créditos e da integração Lovable AI ativa.", 401);
  const { generateImage } = await import("ai");
  const client = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  try {
    const result = await generateImage({
      model: client.image("openai/gpt-image-2"),
      prompt,
      size: "1024x1536",
      n: 1,
      maxRetries: 1,
    });
    if (!result.image?.uint8Array?.byteLength) throw new AiError("A IA não retornou uma imagem válida.");
    return { bytes: result.image.uint8Array, mediaType: result.image.mediaType || "image/png" };
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 402) throw new AiError("Sem créditos disponíveis para gerar imagens no Lovable.", 402);
    if (status === 429) throw new AiError("Limite de geração atingido. Tente mais tarde.", 429);
    if (status === 400 || status === 404) throw new AiError("O modelo de imagens ainda não está disponível neste workspace. Utilize imagem própria.", status);
    if (status === 401 || status === 403) throw new AiError("A geração de imagens não foi habilitada para este projeto.", status);
    throw err;
  }
}
