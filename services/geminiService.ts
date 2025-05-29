// services/geminiService.ts
// Google Gemini API service – 修正版

interface GeminiMessagePart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  text: string;
  durationMs: number;
  error?: string;
}

const DEFAULT_GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta';

/**
 * 调用 Gemini（Pro / Flash / Vision）并支持流式输出
 */
export const generateResponse = async (
  prompt: string,
  modelName: string,
  systemInstruction?: string,
  shouldUseReducedCapacity: boolean = false,
  imagePart?: { inlineData: { mimeType: string; data: string } },
  customBaseUrl?: string,
  apiKey?: string,
  onStreamChunk?: (
    newChunk: string,
    fullText: string,
    isComplete: boolean
  ) => void
): Promise<GeminiResponse> => {
  const startTime = performance.now();

  try {
    // ---------- 基础校验 ----------
    if (!apiKey?.trim()) {
      throw new Error('API密钥未设置。请配置您的 Gemini API 密钥。');
    }

    // ---------- 组装消息 ----------
    const userParts: GeminiMessagePart[] = [{ text: prompt }];
    if (imagePart) userParts.push({ inlineData: imagePart.inlineData });

    const contents: Array<{ role: string; parts: GeminiMessagePart[] }> = [
      { role: 'user', parts: userParts }
    ];

    const requestBody: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: shouldUseReducedCapacity ? 0.3 : 0.7,
        maxOutputTokens: shouldUseReducedCapacity ? 1000 : 4000
      }
    };

    // ✅ 系统指令：system_instruction（蛇形命名）
    if (systemInstruction) {
      requestBody.system_instruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // ---------- 构造 URL ----------
    const apiBase = customBaseUrl || DEFAULT_GEMINI_API_BASE;
    const endpoint = onStreamChunk ? 'streamGenerateContent' : 'generateContent';
    const url = `${apiBase}/models/${modelName}:${endpoint}?key=${apiKey}${
      onStreamChunk ? '&alt=sse' : ''
    }`;

    // ---------- 发起请求 ----------
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;

      if (response.status === 401) {
        throw new Error(`API密钥无效或已过期: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`API调用频率超限: ${errorMessage}`);
      } else if (response.status === 404) {
        throw new Error(`模型不存在或无权访问: ${modelName}`);
      } else {
        throw new Error(`Gemini API 错误 (${response.status}): ${errorMessage}`);
      }
    }

    // ---------- 解析响应 ----------
    let fullText = '';
    const durationMs = performance.now() - startTime;

    // --- 流式模式 ---
    if (onStreamChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') {
              onStreamChunk('', fullText, true);
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const text =
                parsed.candidates?.[0]?.content?.parts
                  ?.map((p: any) => p.text)
                  .join('') || '';

              if (text) {
                fullText += text;
                onStreamChunk(text, fullText, false);
              }
            } catch (e) {
              console.warn('解析流数据时出错:', e);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
    // --- 非流式模式 ---
    else {
      const data = await response.json();
      fullText =
        data.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text)
          .join('') || '';
    }

    if (!fullText.trim()) {
      throw new Error('AI 响应为空，请检查模型配置或重试。');
    }

    return { text: fullText, durationMs };
  } catch (error) {
    console.error('调用 Gemini API 时出错:', error);
    const durationMs = performance.now() - startTime;

    if (error instanceof Error) {
      if (
        error.message.includes('API密钥') ||
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
      ) {
        return {
          text: 'API密钥无效或已过期。请检查您的 Gemini API 密钥配置。',
          durationMs,
          error: 'API key not valid'
        };
      } else if (
        error.message.includes('429') ||
        error.message.includes('Rate limit')
      ) {
        return {
          text: 'API调用频率超限，请稍后重试。',
          durationMs,
          error: 'Rate limit exceeded'
        };
      } else if (
        error.message.includes('404') ||
        error.message.includes('模型')
      ) {
        return {
          text: `模型 ${modelName} 不存在或无权访问。请检查模型名称或 API 权限。`,
          durationMs,
          error: 'Model not found'
        };
      } else if (
        error.message.includes('网络') ||
        error.message.includes('fetch')
      ) {
        return {
          text: '网络连接错误，请检查网络后重试。',
          durationMs,
          error: 'Network error'
        };
      }

      return {
        text: `与 Gemini 通信时出错: ${error.message}`,
        durationMs,
        error: error.message
      };
    }

    return {
      text: '与 Gemini 通信时发生未知错误。',
      durationMs,
      error: 'Unknown Gemini error'
    };
  }
};
