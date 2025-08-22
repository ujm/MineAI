import mineflayer from 'mineflayer';
import pkg from 'mineflayer-pathfinder';
const { pathfinder, Movements, goals } = pkg;
import vec3 from 'vec3';

/**
 * Minecraft ボット制御クラス
 */
class MinecraftBot {
  constructor(config) {
    this.config = config;
    this.bot = null;
    this.isConnected = false;
    this.currentTask = null;
    this.movements = null;
  }

  /**
   * Minecraftサーバーに接続
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log('Minecraftサーバーに接続中...');
      
      // ボット設定
      const botOptions = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        version: this.config.version,
        auth: this.config.auth || 'offline'
      };

      // ローカル接続の場合の追加設定
      if (this.config.host === 'localhost' || this.config.host === '127.0.0.1') {
        botOptions.skipValidation = true;
      }

      this.bot = mineflayer.createBot(botOptions);
      this.setupEventHandlers(resolve, reject);
      
      // プラグインの読み込み
      this.bot.loadPlugin(pathfinder);
    });
  }

  /**
   * イベントハンドラーの設定
   */
  setupEventHandlers(resolve, reject) {
    // スポーン成功
    this.bot.once('spawn', () => {
      console.log(`ボット "${this.config.username}" がスポーンしました`);
      this.isConnected = true;
      
      // Pathfinderの設定
      this.initializePathfinder();
      
      resolve();
    });

    // エラーハンドリング
    this.bot.on('error', (err) => {
      console.error('ボットエラー:', err.message);
      if (!this.isConnected) {
        reject(err);
      }
    });

    // キック処理
    this.bot.on('kicked', (reason) => {
      console.log('サーバーからキックされました:', reason);
      this.isConnected = false;
    });

    // 接続終了処理
    this.bot.on('end', () => {
      console.log('サーバー接続が終了しました');
      this.isConnected = false;
    });

    // チャット監視
    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return;
      console.log(`[チャット] ${username}: ${message}`);
    });

    // 体力変化の監視
    this.bot.on('health', () => {
      if (this.bot.health <= 5) {
        console.warn(`警告: 体力が低下しています (${this.bot.health}/20)`);
      }
    });

    // 死亡処理
    this.bot.on('death', () => {
      console.log('ボットが死亡しました。リスポーン待機中...');
    });
  }

  /**
   * Pathfinderの初期化
   */
  async initializePathfinder() {
    try {
      // minecraft-dataの動的インポート (ESM対応)
      const mcData = (await import('minecraft-data')).default(this.bot.version);
      this.movements = new Movements(this.bot, mcData);
      
      // 移動設定の最適化
      this.movements.allow1by1towers = true;  // 1x1タワーの建設を許可
      this.movements.canDig = true;           // ブロックの破壊を許可
      this.movements.scafoldingBlocks.push(mcData.blocksByName.dirt.id); // 土で足場作成
      
      this.bot.pathfinder.setMovements(this.movements);
      console.log('Pathfinder初期化完了');
    } catch (error) {
      console.error('Pathfinder初期化エラー:', error.message);
    }
  }

  /**
   * ゲーム状態の取得
   */
  getGameState() {
    if (!this.bot || !this.isConnected) {
      return null;
    }

    return {
      position: {
        x: Math.floor(this.bot.entity.position.x),
        y: Math.floor(this.bot.entity.position.y),
        z: Math.floor(this.bot.entity.position.z)
      },
      health: this.bot.health,
      food: this.bot.food,
      inventory: this.getInventoryItems(),
      nearbyBlocks: this.getNearbyBlocks(),
      nearbyEntities: this.getNearbyEntities(),
      time: this.bot.time.timeOfDay,
      weather: this.bot.isRaining ? 'rain' : 'clear'
    };
  }

  /**
   * インベントリアイテムの取得
   */
  getInventoryItems() {
    if (!this.bot) return [];
    
    return this.bot.inventory.items().map(item => ({
      name: item.name,
      displayName: item.displayName,
      count: item.count,
      slot: item.slot
    }));
  }

  /**
   * 周辺ブロックの取得
   */
  getNearbyBlocks(radius = 5) {
    if (!this.bot) return [];
    
    const blocks = [];
    const pos = this.bot.entity.position;
    const maxBlocks = 50; // パフォーマンスのため制限
    
    for (let x = -radius; x <= radius && blocks.length < maxBlocks; x++) {
      for (let y = -2; y <= 2 && blocks.length < maxBlocks; y++) {
        for (let z = -radius; z <= radius && blocks.length < maxBlocks; z++) {
          const block = this.bot.blockAt(pos.offset(x, y, z));
          if (block && block.name !== 'air') {
            blocks.push({
              name: block.name,
              position: {
                x: block.position.x,
                y: block.position.y,
                z: block.position.z
              }
            });
          }
        }
      }
    }
    
    return blocks;
  }

  /**
   * 周辺エンティティの取得
   */
  getNearbyEntities(radius = 10) {
    if (!this.bot) return [];
    
    const entities = [];
    for (const entity of Object.values(this.bot.entities)) {
      if (entity === this.bot.entity) continue;
      
      const distance = this.bot.entity.position.distanceTo(entity.position);
      if (distance <= radius) {
        entities.push({
          type: entity.type,
          name: entity.username || entity.name || entity.type,
          position: entity.position,
          distance: Math.floor(distance)
        });
      }
    }
    
    return entities.slice(0, 20); // 最大20個まで
  }

  // ========== アクション実装 ==========

  /**
   * 指定位置への移動
   */
  async moveToPosition(x, y, z) {
    if (!this.bot || !this.isConnected) {
      throw new Error('ボットが接続されていません');
    }

    console.log(`座標 (${x}, ${y}, ${z}) へ移動中...`);
    
    const goal = new goals.GoalBlock(x, y, z);
    this.bot.pathfinder.setGoal(goal);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.bot.pathfinder.setGoal(null);
        console.log('移動がタイムアウトしました');
        resolve(false);
      }, 30000);

      this.bot.once('goal_reached', () => {
        clearTimeout(timeout);
        console.log(`目標地点 (${x}, ${y}, ${z}) に到達しました`);
        resolve(true);
      });
    });
  }

  /**
   * ブロックの破壊
   */
  async mineBlock(blockType) {
    if (!this.bot || !this.isConnected) {
      throw new Error('ボットが接続されていません');
    }

    console.log(`${blockType} を探しています...`);
    
    const blocks = this.bot.findBlocks({
      matching: (block) => block.name === blockType,
      maxDistance: 32,
      count: 10
    });

    if (blocks.length === 0) {
      console.log(`${blockType} が見つかりません`);
      return false;
    }

    console.log(`${blocks.length}個の ${blockType} を発見しました`);
    
    for (const blockPos of blocks.slice(0, 3)) { // 最大3個まで
      try {
        const targetBlock = this.bot.blockAt(blockPos);
        
        // ブロックに近づく
        const goal = new goals.GoalLookAtBlock(blockPos, this.bot.world);
        this.bot.pathfinder.setGoal(goal);
        
        await new Promise(resolve => {
          const timeout = setTimeout(resolve, 5000);
          this.bot.once('goal_reached', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
        
        // ブロックを破壊
        await this.bot.dig(targetBlock);
        console.log(`${blockType} を破壊しました`);
        return true;
        
      } catch (error) {
        console.warn(`ブロック破壊に失敗: ${error.message}`);
        continue;
      }
    }
    
    return false;
  }

  /**
   * アイテム収集
   */
  async collectItems(itemType = null, amount = 1) {
    if (!this.bot || !this.isConnected) {
      throw new Error('ボットが接続されていません');
    }

    console.log(`アイテムを収集中... (目標: ${amount}個)`);
    let collected = 0;
    
    for (const entity of Object.values(this.bot.entities)) {
      if (entity.name !== 'item') continue;
      if (collected >= amount) break;
      
      // アイテムタイプのフィルタ
      if (itemType) {
        const metadata = entity.metadata[8]; // アイテムメタデータ
        if (!metadata || !metadata.present || 
            !metadata.value.name.includes(itemType)) {
          continue;
        }
      }
      
      try {
        const distance = this.bot.entity.position.distanceTo(entity.position);
        if (distance > 32) continue; // 距離制限
        
        // アイテムの場所へ移動
        const goal = new goals.GoalBlock(
          Math.floor(entity.position.x),
          Math.floor(entity.position.y),
          Math.floor(entity.position.z)
        );
        
        this.bot.pathfinder.setGoal(goal);
        
        await new Promise(resolve => {
          const timeout = setTimeout(resolve, 10000);
          this.bot.once('goal_reached', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
        
        collected++;
        console.log(`アイテムを収集しました (${collected}/${amount})`);
        
        // 少し待機
        await this.wait(1000);
        
      } catch (error) {
        console.warn('アイテム収集エラー:', error.message);
      }
    }
    
    console.log(`${collected}個のアイテムを収集しました`);
    return collected;
  }

  /**
   * チャットメッセージ送信
   */
  sendChat(message) {
    if (!this.bot || !this.isConnected) {
      throw new Error('ボットが接続されていません');
    }

    console.log(`[送信] ${message}`);
    this.bot.chat(message);
  }

  /**
   * 待機
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ボットの状態確認
   */
  isAlive() {
    return this.bot && this.isConnected && this.bot.health > 0;
  }

  /**
   * 接続終了
   */
  async disconnect() {
    if (this.bot) {
      console.log('ボットの接続を終了します...');
      this.bot.quit();
      this.isConnected = false;
      this.bot = null;
    }
  }
}

export default MinecraftBot;
