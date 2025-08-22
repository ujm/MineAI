import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude API インターフェース
 */
class LLMInterface {
  constructor(apiKey, model = 'claude-sonnet-4-20250514') {
    if (!apiKey) {
      throw new Error('Anthropic API キーが必要です');
    }
    
    this.anthropic = new Anthropic({ apiKey });
    this.model = model;
  }

  /**
   * ユーザーコマンドをタスクリストに解析
   * @param {string} userInput - ユーザーの指示
   * @param {Object} gameState - ゲームの現在状態
   * @returns {Object|null} - 解析されたタスク情報
   */
  async parseCommand(userInput, gameState) {
    const prompt = this.buildCommandPrompt(userInput, gameState);
    
    try {
      console.log('LLMに指示を解析中...');
      
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0].text;
      return this.extractJSON(content);
      
    } catch (error) {
      console.error('LLM解析エラー:', error.message);
      return null;
    }
  }

  /**
   * 次のアクションを取得（動的判断用）
   * @param {string} currentSituation - 現在の状況
   * @param {string} goal - 目標
   * @returns {string|null} - 提案されるアクション
   */
  async getNextAction(currentSituation, goal) {
    const prompt = `
現在の状況: ${currentSituation}
目標: ${goal}

次に実行すべき具体的なアクションを1つ提案してください。
Minecraftの世界で実現可能な具体的なアクションを日本語で説明してください。
`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('LLMアクション取得エラー:', error.message);
      return null;
    }
  }

  /**
   * コマンド解析用のプロンプトを構築
   * @param {string} userInput - ユーザー指示
   * @param {Object} gameState - ゲーム状態
   * @returns {string} - プロンプト
   */
  buildCommandPrompt(userInput, gameState) {
    return `
あなたはMinecraftのAIエージェントです。
ユーザーの指示を解析し、実行可能なタスクリストに変換してください。

現在の状態:
- 位置: ${JSON.stringify(gameState.position)}
- 体力: ${gameState.health}/20
- 空腹度: ${gameState.food}/20
- インベントリ: ${JSON.stringify(gameState.inventory)}
- 周辺ブロック: ${gameState.nearbyBlocks?.length || 0}個
- 周辺エンティティ: ${gameState.nearbyEntities?.length || 0}個

ユーザーの指示: "${userInput}"

以下の形式でJSONを返してください:
{
  "tasks": [
    {
      "action": "動作タイプ",
      "parameters": {},
      "description": "説明"
    }
  ],
  "summary": "実行計画の要約"
}

利用可能なアクション:
- move: 指定座標への移動 (parameters: {x, y, z})
- mine: ブロックの破壊 (parameters: {blockType})
- place: ブロックの設置 (parameters: {blockType, position})
- collect: アイテム収集 (parameters: {itemType, amount})
- craft: アイテムクラフト (parameters: {item, amount})
- chat: チャットメッセージ送信 (parameters: {message})

注意:
- 座標は現在位置からの相対的な移動も可能
- ブロック名は英語名を使用 (例: oak_wood, stone, dirt)
- 現実的で実行可能なタスクのみを生成
`;
  }

  /**
   * レスポンスからJSONを抽出
   * @param {string} content - LLMのレスポンス
   * @returns {Object|null} - 抽出されたJSON
   */
  extractJSON(content) {
    try {
      // JSONブロックを探す
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 基本的な構造チェック
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          console.log('解析成功:', parsed.summary || 'タスクを解析しました');
          return parsed;
        }
      }
      
      throw new Error('有効なJSON形式が見つかりませんでした');
    } catch (error) {
      console.error('JSON解析エラー:', error.message);
      console.log('LLMレスポンス:', content);
      return null;
    }
  }

  /**
   * エラー状況の分析と対応策の提案
   * @param {string} errorDescription - エラーの説明
   * @param {Object} gameState - ゲーム状態
   * @returns {string|null} - 対応策
   */
  async analyzeError(errorDescription, gameState) {
    const prompt = `
Minecraftボットでエラーが発生しました:
エラー: ${errorDescription}
現在の状態: ${JSON.stringify(gameState)}

このエラーの原因と解決策を日本語で簡潔に説明してください。
`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('エラー分析失敗:', error.message);
      return null;
    }
  }
}

export default LLMInterface;