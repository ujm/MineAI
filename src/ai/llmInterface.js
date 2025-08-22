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

  /**
   * TaskExecutorから呼ばれるparseCommandメソッド
   * 既存のanalyzeTaskメソッドをラップして互換性を保つ
   */
  async parseCommand(instruction, context = {}) {
    try {
      console.log(`🧠 指示を解析中: "${instruction}"`);
      
      // analyzeTaskメソッドを使用してタスクを解析
      const analysisResult = await this.analyzeTask(instruction, context);
      
      // TaskExecutorが期待する形式に変換
      const actions = this.convertTasksToActions(analysisResult.tasks || []);
      
      return {
        success: true,
        actions: actions,
        reasoning: analysisResult.reasoning || '',
        originalInput: instruction
      };
    } catch (error) {
      console.error('parseCommand error:', error);
      
      // フォールバック: 簡単なキーワード解析
      return this.createFallbackCommand(instruction);
    }
  }

  /**
   * analyzeTaskの結果をActionの形式に変換
   */
  convertTasksToActions(tasks) {
    const actions = [];
    
    for (const task of tasks) {
      switch (task.type) {
        case 'move':
          if (typeof task.target === 'object' && task.target.x !== undefined) {
            // 絶対座標移動
            actions.push({
              action: 'move',
              params: {
                x: task.target.x,
                y: task.target.y || 64,
                z: task.target.z
              }
            });
          } else if (task.details && task.details.direction) {
            // 相対移動
            const direction = this.parseDirection(task.details.direction, task.details.distance || 1);
            actions.push({
              action: 'moveRelative',
              params: direction
            });
          } else {
            // デフォルトの前進
            actions.push({
              action: 'moveRelative',
              params: { x: 1, y: 0, z: 0 }
            });
          }
          break;
          
        case 'dig':
        case 'mine':
          actions.push({
            action: 'mine',
            params: {
              blockType: task.target,
              amount: task.details?.amount || 1
            }
          });
          break;
          
        case 'collect':
          actions.push({
            action: 'collect',
            params: {
              itemType: task.target,
              amount: task.details?.amount || 1
            }
          });
          break;
          
        case 'place':
          actions.push({
            action: 'place',
            params: {
              blockType: task.target,
              position: task.details?.position || null
            }
          });
          break;
          
        case 'craft':
          actions.push({
            action: 'craft',
            params: {
              item: task.target,
              amount: task.details?.amount || 1
            }
          });
          break;
          
        case 'chat':
          actions.push({
            action: 'chat',
            params: {
              message: task.target || task.details?.message || 'こんにちは'
            }
          });
          break;
          
        default:
          console.warn(`Unknown task type: ${task.type}`);
          break;
      }
    }
    
    return actions;
  }

  /**
   * 方向と距離を相対座標に変換
   */
  parseDirection(direction, distance = 1) {
    const dir = direction.toLowerCase();
    
    if (dir.includes('前') || dir.includes('forward') || dir.includes('まっすぐ')) {
      return { x: distance, y: 0, z: 0 };
    } else if (dir.includes('後') || dir.includes('back')) {
      return { x: -distance, y: 0, z: 0 };
    } else if (dir.includes('右') || dir.includes('right')) {
      return { x: 0, y: 0, z: distance };
    } else if (dir.includes('左') || dir.includes('left')) {
      return { x: 0, y: 0, z: -distance };
    } else if (dir.includes('上') || dir.includes('up')) {
      return { x: 0, y: distance, z: 0 };
    } else if (dir.includes('下') || dir.includes('down')) {
      return { x: 0, y: -distance, z: 0 };
    }
    
    // デフォルトは前進
    return { x: distance, y: 0, z: 0 };
  }

  /**
   * フォールバックコマンド（API呼び出し失敗時）
   */
  createFallbackCommand(instruction) {
    console.warn('🔄 フォールバック解析を使用します');
    
    const input = instruction.toLowerCase();
    
    // 歩数の解析
    if (input.includes('歩') || input.includes('進') || input.includes('移動')) {
      const numbers = instruction.match(/\d+/g);
      const distance = numbers ? parseInt(numbers[0]) : 1;
      
      return {
        success: true,
        actions: [{
          action: 'moveRelative',
          params: { x: distance, y: 0, z: 0 }
        }],
        reasoning: `${distance}ブロック前進します`,
        originalInput: instruction,
        fallback: true
      };
    }
    
    // チャット
    if (input.includes('チャット') || input.includes('話') || input.includes('言')) {
      return {
        success: true,
        actions: [{
          action: 'chat',
          params: { message: 'こんにちは！' }
        }],
        reasoning: 'チャットでメッセージを送信します',
        originalInput: instruction,
        fallback: true
      };
    }
    
    // 採掘
    if (input.includes('掘') || input.includes('採掘') || input.includes('mine')) {
      return {
        success: true,
        actions: [{
          action: 'mine',
          params: { blockType: 'any', amount: 1 }
        }],
        reasoning: 'ブロックを採掘します',
        originalInput: instruction,
        fallback: true
      };
    }

    // 理解できない場合
    return {
      success: false,
      error: '指示を理解できませんでした',
      actions: [{
        action: 'chat',
        params: { message: 'すみません、指示を理解できませんでした' }
      }],
      reasoning: '指示が不明確です',
      originalInput: instruction,
      fallback: true
    };
  }

  // 既存のメソッドはそのまま保持
  async analyzeTask(instruction, context = {}) {
    try {
      console.log(`Analyzing task with ${this.model}: "${instruction}"`);
      const systemPrompt = `You are a Minecraft bot assistant. Analyze the user's instruction and convert it into executable tasks.

Context:
- Bot position: ${JSON.stringify(context.position || {})}
- Nearby blocks: ${JSON.stringify(context.nearbyBlocks || [])}
- Inventory: ${JSON.stringify(context.inventory || [])}

For movement instructions like "walk 3 steps forward" or "まっすぐ3歩歩いて", use:
{
  "tasks": [
    {
      "type": "move",
      "target": "relative",
      "details": {
        "direction": "forward",
        "distance": 3
      }
    }
  ],
  "reasoning": "Moving 3 blocks forward"
}

Respond with a JSON object containing:
{
  "tasks": [
    {
      "type": "dig|place|move|craft|collect|chat",
      "target": "block_name or coordinates or message",
      "details": {
        "direction": "forward|back|left|right|up|down",
        "distance": number,
        "amount": number,
        "position": {x, y, z}
      }
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
