import { BotRole, GeminiModelType, AnalysisCategory } from '../types';

export interface ChatApiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatApiResponse {
  text: string;
  modelUsed: string;
  role: string;
}

export interface ImageAnalysisApiResponse {
  analysis: string;
  analysisType: string;
  modelUsed: string;
  timestamp: string;
}

export const geminiService = {
  /**
   * Send multi-turn conversation messages to the server-side Gemini API
   */
  async sendMessage(params: {
    messages: ChatApiMessage[];
    model: GeminiModelType;
    botRole: BotRole;
    systemInstruction?: string;
  }): Promise<ChatApiResponse> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    return response.json();
  },

  /**
   * Analyze uploaded medical image or scan using Gemini (gemini-3.1-pro-preview)
   */
  async analyzeMedicalImage(params: {
    image: string; // Base64 data URL
    mimeType?: string;
    analysisType: AnalysisCategory;
    prompt?: string;
    model?: string;
  }): Promise<ImageAnalysisApiResponse> {
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    return response.json();
  },

  /**
   * Health check to confirm API status
   */
  async checkHealth(): Promise<{ status: string; hasApiKey: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Ignore network errors
    }
    return { status: 'error', hasApiKey: false };
  },
};
