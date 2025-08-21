/**
 * タスク実行システム
 * LLMからの指示をMinecraftボットのアクションに変換して実行
 */
class TaskExecutor {
  constructor(bot, llm) {
    this.bot = bot;
    this.llm = llm;
    this.taskQueue = [];
    this.isExecuting = false;
    this.executionHistory = [];
  }

  /**
   * ユーザーコマンドを実行
   * @param {string} userInput - ユーザーの指示
   * @returns {boolean} - 実行成功フラグ
   */
  async executeCommand(userInput) {
    if (this.isExecuting) {
      console.log('既に他のタスクを実行中です。しばらくお待ちください。');
      return false;
    }

    console.log(`\n=== 指示を実行します: "${userInput}" ===`);

    try {
      this.isExecuting = true;
      
      // ゲーム状態の取得
      const gameState = this.bot.getGameState();
      if (!gameState) {
        console.error('ボットの状態を取得できません');
        return false;
      }

      // LLMでコマンドを解析
      const parsedCommand = await this.llm.parseCommand(userInput, gameState);
      
      if (!parsedCommand || !parsedCommand.tasks || parsedCommand.tasks.length === 0) {
        console.log('実行可能なタスクが見つかりませんでした');
        return false;
      }

      console.log(`📋 実行計画: ${parsedCommand.summary}`);
      console.log(`📝 タスク数: ${parsedCommand.tasks.length}`);
      
      // タスクの実行
      let successCount = 0;
      for (let i = 0; i < parsedCommand.tasks.length; i++) {
        const task = parsedCommand.tasks[i];
        console.log(`\n[${i + 1}/${parsedCommand.tasks.length}] ${task.description}`);
        
        const success = await this.executeTask(task);
        if (success) {
          successCount++;
        } else {
          console.warn(`タスク "${task.description}" の実行に失敗しました`);
        }
        
        // タスク間の待機
        if (i < parsedCommand.tasks.length - 1) {
          await this.wait(1000);
        }
      }
      
      // 実行結果のサマリー
      console.log(`\n✅ 実行完了: ${successCount}/${parsedCommand.tasks.length} タスクが成功しました`);
      
      // 実行履歴に追加
      this.executionHistory.push({
        input: userInput,
        tasks: parsedCommand.tasks,
        successCount,
        timestamp: new Date().toISOString()
      });
      
      return successCount > 0;
      
    } catch (error) {
      console.error('コマンド実行エラー:', error.message);
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 個別タスクの実行
   * @param {Object} task - 実行するタスク
   * @returns {boolean} - 実行成功フラグ
   */
  async executeTask(task) {
    if (!this.bot.isAlive()) {
      console.error('ボットが利用できない状態です');
      return false;
    }

    try {
      const startTime = Date.now();
      let result = false;
      
      switch (task.action) {
        case 'move':
          result = await this.executeMove(task.parameters);
          break;
          
        case 'mine':
          result = await this.executeMine(task.parameters);
          break;
          
        case 'collect':
          result = await this.executeCollect(task.parameters);
          break;
          
        case 'chat':
          result = await this.executeChat(task.parameters);
          break;
          
        case 'place':
          result = await this.executePlace(task.parameters);
          break;
          
        case 'craft':
          result = await this.executeCraft(task.parameters);
          break;
          
        default:
          console.log(`⚠️  未実装のアクション: ${task.action}`);
          return false;
      }
      
      const duration = Date.now() - startTime;
      if (result) {
        console.log(`✅ 完了 (${duration}ms)`);
      } else {
        console.log(`❌ 失敗 (${duration}ms)`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`タスク実行エラー [${task.action}]:`, error.message);
      return false;
    }
  }

  /**
   * 移動タスクの実行
   */
  async executeMove(params) {
    const { x, y, z } = params;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
      console.error('移動座標が無効です:', params);
      return false;
    }
    
    return await this.bot.moveToPosition(x, y, z);
  }

  /**
   * 採掘タスクの実行
   */
  async executeMine(params) {
    const { blockType } = params;
    if (!blockType) {
      console.error('採掘するブロックタイプが指定されていません');
      return false;
    }
    
    return await this.bot.mineBlock(blockType);
  }

  /**
   * アイテム収集タスクの実行
   */
  async executeCollect(params) {
    const { itemType, amount = 1 } = params;
    const collected = await this.bot.collectItems(itemType, amount);
    return collected > 0;
  }

  /**
   * チャットタスクの実行
   */
  async executeChat(params) {
    const { message } = params;
    if (!message) {
      console.error('チャットメッセージが指定されていません');
      return false;
    }
    
    this.bot.sendChat(message);
    return true;
  }

  /**
   * ブロック設置タスクの実行
   */
  async executePlace(params) {
    console.log('ブロック設置機能は現在開発中です');
    return false;
  }

  /**
   * クラフトタスクの実行
   */
  async executeCraft(params) {
    console.log('クラフト機能は現在開発中です');
    return false;
  }

  /**
   * 待機
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 実行履歴の取得
   */
  getExecutionHistory(limit = 10) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * 現在のタスクキューの状態
   */
  getStatus() {
    return {
      isExecuting: this.isExecuting,
      queueLength: this.taskQueue.length,
      historyCount: this.executionHistory.length
    };
  }

  /**
   * タスクキューのクリア
   */
  clearQueue() {
    this.taskQueue = [];
    console.log('タスクキューをクリアしました');
  }

  /**
   * 緊急停止
   */
  async emergencyStop() {
    console.log('🚨 緊急停止を実行します...');
    this.isExecuting = false;
    this.taskQueue = [];
    
    // ボットの移動を停止
    if (this.bot && this.bot.bot) {
      this.bot.bot.pathfinder.setGoal(null);
    }
    
    console.log('✅ 緊急停止完了');
  }

  /**
   * 現在の状況を分析してLLMに次の行動を相談
   */
  async consultLLMForNextAction(goal) {
    if (!this.llm) return null;
    
    const gameState = this.bot.getGameState();
    if (!gameState) return null;
    
    const currentSituation = `
位置: (${gameState.position.x}, ${gameState.position.y}, ${gameState.position.z})
体力: ${gameState.health}/20
空腹度: ${gameState.food}/20
インベントリアイテム数: ${gameState.inventory.length}
周辺ブロック数: ${gameState.nearbyBlocks.length}
時間: ${gameState.time}
天候: ${gameState.weather}
`;
    
    return await this.llm.getNextAction(currentSituation, goal);
  }
}

export default TaskExecutor;