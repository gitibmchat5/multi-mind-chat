// Gemini API service
interface GeminiMessagePart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  text: string;
  durationMs: number;
  error?: string;
}

const DEFAULT_GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const generateResponse = async (
  prompt: string,
  modelName: string,
  systemInstruction?: string,
  shouldUseReducedCapacity: boolean = false,
  imagePart?: { inlineData: { mimeType: string; data: string } },
  customBaseUrl?: string,
  apiKey?: string,
  onStreamChunk?: (newChunk: string, fullText: string, isComplete: boolean) => void
): Promise<GeminiResponse> => {
  const startTime = performance.now();

  try {
    if (!apiKey?.trim()) {
      throw new Error('API密钥未设置。请配置您的Gemini API密钥。');
    }

    const userParts: GeminiMessagePart[] = [{ text: prompt }];
    if (imagePart) {
      userParts.push({ inlineData: imagePart.inlineData });
    }

    const contents: Array<{ role: string; parts: GeminiMessagePart[] }> = [
      { role: 'user', parts: userParts }
    ];

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: shouldUseReducedCapacity ? 0.3 : 0.7,
        maxOutputTokens: shouldUseReducedCapacity ? 1000 : 4000
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = { role: 'user', parts: [{ text: systemInstruction }] };
    }

    const apiBase = customBaseUrl || DEFAULT_GEMINI_API_BASE;
    const endpoint = onStreamChunk ? 'streamGenerateContent' : 'generateContent';
    const url = `${apiBase}/models/${modelName}:${endpoint}?key=${apiKey}`;

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

    let fullText = '';
    const durationMs = performance.now() - startTime;

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
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              if (jsonStr === '[DONE]') {
                onStreamChunk('', fullText, true);
                break;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
                if (text) {
                  fullText += text;
                  onStreamChunk(text, fullText, false);
                }
              } catch (e) {
                console.warn('解析流数据时出错:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      const data = await response.json();
      fullText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    }

    if (!fullText.trim()) {
      throw new Error('AI响应为空，请检查模型配置或重试');
    }

    return { text: fullText, durationMs };

  } catch (error) {
    console.error('调用Gemini API时出错:', error);
    const durationMs = performance.now() - startTime;

    if (error instanceof Error) {
      if (error.message.includes('API密钥') || error.message.includes('401') || error.message.includes('Unauthorized')) {
        return { text: 'API密钥无效或已过期。请检查您的Gemini API密钥配置。', durationMs, error: 'API key not valid' };
      } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
        return { text: 'API调用频率超限，请稍后重试。', durationMs, error: 'Rate limit exceeded' };
      } else if (error.message.includes('404') || error.message.includes('模型')) {
        return { text: `模型 ${modelName} 不存在或无权访问。请检查模型名称或API权限。`, durationMs, error: 'Model not found' };
      } else if (error.message.includes('网络') || error.message.includes('fetch')) {
        return { text: '网络连接错误，请检查网络连接后重试。', durationMs, error: 'Network error' };
      }
      return { text: `与Gemini通信时出错: ${error.message}`, durationMs, error: error.message };
    }
    return { text: '与Gemini通信时发生未知错误。', durationMs, error: 'Unknown Gemini error' };
  }
};
