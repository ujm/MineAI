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

    console.log(`\n=== TaskExecutor デバッグ開始 ===`);
    console.log(`📥 受信した指示: "${userInput}"`);

    try {
      this.isExecuting = true;
      
      // ゲーム状態の取得
      const gameState = this.bot.getGameState();
      if (!gameState) {
        console.error('ボットの状態を取得できません');
        return false;
      }

      console.log(`📊 ボット状態: ${JSON.stringify(gameState, null, 2)}`);

      // LLMでコマンドを解析
      const parsedCommand = await this.llm.parseCommand(userInput, gameState);
      
      console.log(`🔍 LLMからの返答:`, JSON.stringify(parsedCommand, null, 2));

      // アクションの存在確認
      if (!parsedCommand || !parsedCommand.actions || parsedCommand.actions.length === 0) {
        console.error('❌ アクションが空です');
        console.log('parsedCommand.success:', parsedCommand?.success);
        console.log('parsedCommand.error:', parsedCommand?.error);
        console.log('実行可能なタスクが見つかりませんでした');
        return false;
      }

      console.log(`✅ ${parsedCommand.actions.length}個のアクションを受信`);

      // 各アクションをチェック
      parsedCommand.actions.forEach((action, index) => {
        console.log(`🎯 アクション ${index + 1}:`);
        console.log(`   - タイプ: ${action.action}`);
        console.log(`   - パラメータ: ${JSON.stringify(action.params)}`);
        
        // アクションタイプの検証
        const validActions = ['move', 'moveRelative', 'mine', 'collect', 'chat', 'place', 'craft', 'stop', 'look'];
        if (!validActions.includes(action.action)) {
          console.warn(`⚠️  無効なアクションタイプ: ${action.action}`);
        }
        
        // パラメータの検証
        if (!action.params) {
          console.warn(`⚠️  パラメータが存在しません`);
        }
      });

      // 実際のアクション実行前にログ
      console.log('🚀 アクション実行を開始します...');

      console.log(`📝 アクション数: ${parsedCommand.actions.length}`);
      
      // アクションの実行 (新しいアクション形式を使用)
      let successCount = 0;
      for (let i = 0; i < parsedCommand.actions.length; i++) {
        const action = parsedCommand.actions[i];
        console.log(`\n[${i + 1}/${parsedCommand.actions.length}] ${action.action}を実行中`);
        
        const success = await this.executeTask(action);
        if (success) {
          successCount++;
        } else {
          console.warn(`アクション "${action.action}" の実行に失敗しました`);
        }
        
        // タスク間の待機
        if (i < parsedCommand.actions.length - 1) {
          await this.wait(1000);
        }
      }
      
      // 実行結果のサマリー
      console.log(`\n✅ 実行完了: ${successCount}/${parsedCommand.actions.length} アクションが成功しました`);
      
      // 実行履歴に追加
      this.executionHistory.push({
        input: userInput,
        tasks: parsedCommand.actions,  // actionsを使用
        successCount,
        timestamp: new Date().toISOString()
      });

      console.log(`=== TaskExecutor デバッグ終了 ===`);
      
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
          result = await this.executeMove(task.params || task.parameters);
          break;
          
        case 'moveRelative':
          result = await this.executeMoveRelative(task.params || task.parameters);
          break;
          
        case 'mine':
          result = await this.executeMine(task.params || task.parameters);
          break;
          
        case 'collect':
          result = await this.executeCollect(task.params || task.parameters);
          break;
          
        case 'chat':
          result = await this.executeChat(task.params || task.parameters);
          break;
          
        case 'place':
          result = await this.executePlace(task.params || task.parameters);
          break;
          
        case 'craft':
          result = await this.executeCraft(task.params || task.parameters);
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
   * 相対移動タスクの実行
   */
  async executeMoveRelative(params) {
    console.log(`🚶 相対移動実行: ${JSON.stringify(params)}`);
    const { x, y, z } = params;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
      console.error('相対移動座標が無効です:', params);
      return false;
    }
    
    // 現在位置を取得
    const currentPos = this.bot.bot.entity.position;
    console.log(`📍 現在位置: (${currentPos.x}, ${currentPos.y}, ${currentPos.z})`);
    
    // 新しい目標位置を計算
    const targetX = currentPos.x + x;
    const targetY = currentPos.y + y;
    const targetZ = currentPos.z + z;
    
    console.log(`🎯 目標位置: (${targetX}, ${targetY}, ${targetZ})`);
    
    return await this.bot.moveToPosition(targetX, targetY, targetZ);
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