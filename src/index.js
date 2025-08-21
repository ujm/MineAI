import readline from 'readline';
import { config, validateConfig } from './config.js';
import MinecraftBot from './bot/minecraftBot.js';
import LLMInterface from './ai/llmInterface.js';
import TaskExecutor from './taskExecutor.js';

/**
 * Minecraft AI エージェント メインプログラム
 */
class MinecraftAIAgent {
  constructor() {
    this.bot = null;
    this.llm = null;
    this.executor = null;
    this.rl = null;
  }

  /**
   * アプリケーションの初期化
   */
  async initialize() {
    try {
      console.log('🤖 Minecraft AI エージェントを起動しています...');
      console.log('=====================================\n');

      // 設定の検証
      this.validateConfiguration();

      // コンポーネントの初期化
      await this.initializeComponents();

      // Minecraftサーバーへの接続
      await this.connectToMinecraft();

      // コマンドラインインターフェースの設定
      this.setupCommandInterface();

      console.log('\n✅ 初期化完了！指示を入力してください。\n');

    } catch (error) {
      console.error('❌ 初期化エラー:', error.message);
      process.exit(1);
    }
  }

  /**
   * 設定の検証と表示
   */
  validateConfiguration() {
    console.log('⚙️  設定を確認中...');
    
    try {
      validateConfig();
      console.log(`✅ 接続先: ${config.minecraft.host}:${config.minecraft.port}`);
      console.log(`✅ ユーザー名: ${config.minecraft.username}`);
      console.log(`✅ バージョン: ${config.minecraft.version}`);
      console.log(`✅ Claude API: ${config.ai.apiKey ? '設定済み' : '未設定'}`);
      
    } catch (error) {
      throw new Error(`設定エラー: ${error.message}`);
    }
  }

  /**
   * コンポーネントの初期化
   */
  async initializeComponents() {
    console.log('🔧 コンポーネントを初期化中...');
    
    // Minecraft ボットの初期化
    this.bot = new MinecraftBot(config.minecraft);
    
    // LLM インターフェースの初期化
    this.llm = new LLMInterface(config.ai.apiKey, config.ai.model);
    
    // タスク実行システムの初期化
    this.executor = new TaskExecutor(this.bot, this.llm);
    
    console.log('✅ コンポーネント初期化完了');
  }

  /**
   * Minecraftサーバーへの接続
   */
  async connectToMinecraft() {
    console.log('\n🌐 Minecraftサーバーに接続中...');
    
    // LANゲーム接続の説明
    this.displayConnectionInstructions();
    
    try {
      await this.bot.connect();
      console.log('✅ ゲームに接続しました！');
      
      // 初期状態の表示
      await this.displayInitialStatus();
      
    } catch (error) {
      throw new Error(`サーバー接続エラー: ${error.message}`);
    }
  }

  /**
   * 接続方法の説明を表示
   */
  displayConnectionInstructions() {
    console.log('\n📋 ローカルゲームへの接続方法:');
    console.log('   1. Minecraftでワールドを開く');
    console.log('   2. ESCキー → "LANに公開"');
    console.log('   3. 表示されたポート番号を.envファイルに設定');
    console.log('   4. このプログラムを再起動\n');
  }

  /**
   * 初期状態の表示
   */
  async displayInitialStatus() {
    // 少し待ってから状態を取得
    setTimeout(() => {
      const state = this.bot.getGameState();
      if (state) {
        console.log('\n📍 ボットの初期状態:');
        console.log(`   位置: X:${state.position.x}, Y:${state.position.y}, Z:${state.position.z}`);
        console.log(`   体力: ${state.health}/20`);
        console.log(`   空腹度: ${state.food}/20`);
        console.log(`   インベントリ: ${state.inventory.length}個のアイテム`);
      }
    }, 2000);
  }

  /**
   * コマンドラインインターフェースの設定
   */
  setupCommandInterface() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🎮 指示> '
    });

    console.log('\n🎯 コマンド例:');
    console.log('   - "木を5本集めて"');
    console.log('   - "前に10ブロック進んで"');
    console.log('   - "石の家を建てて"');
    console.log('   - "status" (現在の状態を確認)');
    console.log('   - "help" (ヘルプを表示)');
    console.log('   - "exit" (終了)\n');

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const command = input.trim();
      
      if (!command) {
        this.rl.prompt();
        return;
      }

      await this.handleUserInput(command);
      this.rl.prompt();
    });

    this.rl.on('close', async () => {
      await this.shutdown();
    });
  }

  /**
   * ユーザー入力の処理
   */
  async handleUserInput(input) {
    const command = input.toLowerCase();

    try {
      switch (command) {
        case 'exit':
        case 'quit':
          console.log('👋 プログラムを終了します...');
          await this.shutdown();
          break;

        case 'status':
          this.displayStatus();
          break;

        case 'help':
          this.displayHelp();
          break;

        case 'clear':
          console.clear();
          console.log('🤖 Minecraft AI エージェント - 画面をクリアしました\n');
          break;

        case 'stop':
          await this.executor.emergencyStop();
          break;

        case 'history':
          this.displayExecutionHistory();
          break;

        default:
          // LLMを使用してコマンドを実行
          console.log(`\n🧠 指示を解析中: "${input}"`);
          const success = await this.executor.executeCommand(input);
          
          if (success) {
            console.log('✅ 指示の実行が完了しました');
          } else {
            console.log('❌ 指示の実行に失敗しました');
          }
          break;
      }
    } catch (error) {
      console.error('❌ コマンド処理エラー:', error.message);
    }
  }

  /**
   * 現在の状態を表示
   */
  displayStatus() {
    console.log('\n📊 現在の状態:');
    
    const gameState = this.bot.getGameState();
    if (gameState) {
      console.log(`   🏃 位置: (${gameState.position.x}, ${gameState.position.y}, ${gameState.position.z})`);
      console.log(`   ❤️  体力: ${gameState.health}/20`);
      console.log(`   🍖 空腹度: ${gameState.food}/20`);
      console.log(`   🎒 インベントリ: ${gameState.inventory.length}個のアイテム`);
      console.log(`   🌍 周辺ブロック: ${gameState.nearbyBlocks.length}個`);
      console.log(`   👥 周辺エンティティ: ${gameState.nearbyEntities.length}個`);
      console.log(`   🕒 時間: ${gameState.time}`);
      console.log(`   🌤️  天候: ${gameState.weather}`);
    } else {
      console.log('   ❌ ボットの状態を取得できません');
    }

    const executorStatus = this.executor.getStatus();
    console.log(`   ⚙️  実行状態: ${executorStatus.isExecuting ? '実行中' : '待機中'}`);
    console.log(`   📋 実行履歴: ${executorStatus.historyCount}件`);
  }

  /**
   * ヘルプを表示
   */
  displayHelp() {
    console.log('\n📚 利用可能なコマンド:');
    console.log('   🎮 自然言語指示: "木を集めて", "家を建てて"など');
    console.log('   📊 status     - 現在の状態を表示');
    console.log('   📋 history    - 実行履歴を表示');
    console.log('   🛑 stop       - 緊急停止');
    console.log('   🧹 clear      - 画面をクリア');
    console.log('   ❓ help       - このヘルプを表示');
    console.log('   🚪 exit       - プログラムを終了');
  }

  /**
   * 実行履歴を表示
   */
  displayExecutionHistory() {
    const history = this.executor.getExecutionHistory(5);
    
    console.log('\n📜 最近の実行履歴:');
    if (history.length === 0) {
      console.log('   (履歴はありません)');
      return;
    }

    history.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      console.log(`   ${index + 1}. [${timestamp}] "${entry.input}"`);
      console.log(`      → ${entry.successCount}/${entry.tasks.length} タスク成功`);
    });
  }

  /**
   * アプリケーションの終了
   */
  async shutdown() {
    console.log('\n🔄 終了処理中...');
    
    try {
      // タスクの緊急停止
      if (this.executor) {
        await this.executor.emergencyStop();
      }
      
      // ボット接続の終了
      if (this.bot) {
        await this.bot.disconnect();
      }
      
      // コマンドラインインターフェースの終了
      if (this.rl) {
        this.rl.close();
      }
      
      console.log('✅ 終了処理完了');
      
    } catch (error) {
      console.error('終了処理エラー:', error.message);
    } finally {
      process.exit(0);
    }
  }
}

/**
 * エラーハンドリング設定
 */
function setupErrorHandlers() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未処理のPromise拒否:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ 未捕捉の例外:', error);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    console.log('\n\n🛑 強制終了シグナルを受信しました...');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 終了シグナルを受信しました...');
    process.exit(0);
  });
}

/**
 * メイン実行関数
 */
async function main() {
  // エラーハンドリングの設定
  setupErrorHandlers();
  
  // アプリケーションの起動
  const agent = new MinecraftAIAgent();
  await agent.initialize();
}

// アプリケーションの起動
main().catch((error) => {
  console.error('❌ アプリケーション起動エラー:', error);
  process.exit(1);
});