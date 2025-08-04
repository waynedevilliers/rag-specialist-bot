// Multi-model service for supporting different LLM providers
import { OpenAI } from "openai";

export type ModelProvider = 'openai' | 'anthropic' | 'gemini';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: ModelProvider;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ModelService {
  private openai: OpenAI;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    
    // Initialize OpenAI (always available)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateResponse(messages: ChatMessage[]): Promise<ModelResponse> {
    switch (this.config.provider) {
      case 'openai':
        return this.generateOpenAIResponse(messages);
      case 'anthropic':
        return this.generateAnthropicResponse(messages);
      case 'gemini':
        return this.generateGeminiResponse(messages);
      default:
        throw new Error(`Unsupported model provider: ${this.config.provider}`);
    }
  }

  private async generateOpenAIResponse(messages: ChatMessage[]): Promise<ModelResponse> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000,
      });

      const choice = completion.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response generated');
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        model: completion.model,
        provider: 'openai',
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate OpenAI response');
    }
  }

  private async generateAnthropicResponse(messages: ChatMessage[]): Promise<ModelResponse> {
    // Placeholder for Anthropic Claude integration
    // This would require @anthropic-ai/sdk when dependencies allow
    try {
      // For now, fallback to OpenAI with a note about the provider switch
      console.log('Anthropic provider requested, falling back to OpenAI');
      const openAIResponse = await this.generateOpenAIResponse(messages);
      
      // Add a note about the fallback
      return {
        ...openAIResponse,
        content: `[Note: Claude model unavailable, using OpenAI fallback]\n\n${openAIResponse.content}`,
        provider: 'anthropic', // Keep the requested provider for UI purposes
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error('Failed to generate Anthropic response');
    }
  }

  private async generateGeminiResponse(messages: ChatMessage[]): Promise<ModelResponse> {
    // Placeholder for Google Gemini integration
    // This would require @google/generative-ai when dependencies allow
    try {
      // For now, fallback to OpenAI with a note about the provider switch
      console.log('Gemini provider requested, falling back to OpenAI');
      const openAIResponse = await this.generateOpenAIResponse(messages);
      
      // Add a note about the fallback
      return {
        ...openAIResponse,
        content: `[Note: Gemini model unavailable, using OpenAI fallback]\n\n${openAIResponse.content}`,
        provider: 'gemini', // Keep the requested provider for UI purposes
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate Gemini response');
    }
  }

  // Get available models for the current provider
  static getAvailableModels(provider: ModelProvider): string[] {
    switch (provider) {
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      case 'anthropic':
        return ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'];
      case 'gemini':
        return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
      default:
        return [];
    }
  }

  // Get model display names
  static getModelDisplayName(provider: ModelProvider, model: string): string {
    const displayNames: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
      'claude-3-haiku-20240307': 'Claude 3 Haiku',
      'claude-3-opus-20240229': 'Claude 3 Opus',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gemini-pro': 'Gemini Pro',
    };
    
    return displayNames[model] || model;
  }

  // Get provider display name
  static getProviderDisplayName(provider: ModelProvider): string {
    const displayNames: Record<ModelProvider, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'gemini': 'Google Gemini',
    };
    
    return displayNames[provider];
  }

  // Calculate cost estimate (simplified)
  static calculateCost(provider: ModelProvider, model: string, promptTokens: number, completionTokens: number): number {
    // Simplified cost calculation - in production, use actual pricing
    const costs: Record<string, { prompt: number; completion: number }> = {
      'gpt-4o': { prompt: 0.005, completion: 0.015 },
      'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
      'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
      'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
      'gemini-1.5-pro': { prompt: 0.001, completion: 0.003 },
      'gemini-1.5-flash': { prompt: 0.0001, completion: 0.0003 },
      'gemini-pro': { prompt: 0.0005, completion: 0.0015 },
    };

    const modelCost = costs[model] || costs['gpt-4o-mini'];
    const promptCost = (promptTokens / 1000) * modelCost.prompt;
    const completionCost = (completionTokens / 1000) * modelCost.completion;
    
    return promptCost + completionCost;
  }
}