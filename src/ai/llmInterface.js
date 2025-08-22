// src/ai/llmInterface.js
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';

export class LLMInterface {
  constructor(apiKey = config.ai.apiKey, model = config.ai.model) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    this.model = model;
    console.log(`LLMInterface initialized with model: ${this.model}`);
  }

  async analyzeTask(instruction, context = {}) {
    try {
      console.log(`Analyzing task with ${this.model}: "${instruction}"`);
      
      const systemPrompt = `You are a Minecraft bot assistant. Analyze the user's instruction and convert it into executable tasks.
      
Context:
- Bot position: ${JSON.stringify(context.position || {})}
- Nearby blocks: ${JSON.stringify(context.nearbyBlocks || [])}
- Inventory: ${JSON.stringify(context.inventory || [])}

Respond with a JSON object containing:
{
  "tasks": [
    {
      "type": "dig|place|move|craft|collect",
      "target": "block_name or coordinates",
      "details": {}
    }
  ],
  "reasoning": "explanation of the plan"
}`;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: config.ai.maxTokens,
        temperature: config.ai.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: instruction
          }
        ]
      });

      const content = response.content[0].text;
      console.log('LLM Response:', content);
      
      // JSONを解析
      try {
        const parsed = JSON.parse(content);
        return parsed;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // JSONの抽出を試みる
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Failed to parse LLM response as JSON');
      }
    } catch (error) {
      console.error('LLM analysis error:', error);
      throw error;
    }
  }

  async generateResponse(prompt, context = {}) {
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: config.ai.maxTokens,
        temperature: config.ai.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('LLM generation error:', error);
      throw error;
    }
  }
}

export default LLMInterface;
