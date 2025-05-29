import { generateResponse as generateOpenAIResponse } from './openaiService';
import { generateResponse as generateGeminiResponse } from './geminiService';

export const generateResponse = (
  prompt: string,
  modelName: string,
  systemInstruction?: string,
  shouldUseReducedCapacity: boolean = false,
  imagePart?: { inlineData: { mimeType: string; data: string } },
  customBaseUrl?: string,
  apiKey?: string,
  onStreamChunk?: (newChunk: string, fullText: string, isComplete: boolean) => void
) => {
  const base = (customBaseUrl || '').toLowerCase();
  const model = modelName.toLowerCase();
  if (base.includes('generativelanguage.googleapis.com') || model.includes('gemini')) {
    return generateGeminiResponse(
      prompt,
      modelName,
      systemInstruction,
      shouldUseReducedCapacity,
      imagePart,
      customBaseUrl,
      apiKey,
      onStreamChunk
    );
  }

  return generateOpenAIResponse(
    prompt,
    modelName,
    systemInstruction,
    shouldUseReducedCapacity,
    imagePart,
    customBaseUrl,
    apiKey,
    onStreamChunk
  );
};
