export interface TestResult {
  success: boolean;
  message: string;
}

export const testApiChannel = async (
  baseUrl: string,
  apiKey: string,
  name?: string
): Promise<TestResult> => {
  try {
    const lower = baseUrl.toLowerCase();
    let response: Response;
    if (lower.includes('generativelanguage.googleapis.com') || (name && name.toLowerCase().includes('gemini'))) {
      const url = `${baseUrl.replace(/\/$/, '')}/models?key=${apiKey}`;
      response = await fetch(url);
    } else {
      const url = `${baseUrl.replace(/\/$/, '')}/models`;
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
    }
    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
    }
    return { success: true, message: '连接成功' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '未知错误' };
  }
};
