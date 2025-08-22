import dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

// APIキーの取得
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// 設定オブジェクト
export const config = {
    // Minecraft設定
    minecraft: {
        host: process.env.MC_HOST || '172.28.128.1',
        port: parseInt(process.env.MC_PORT || '25565'),
        username: process.env.MC_USERNAME || 'MineAI_Bot',
        version: process.env.MC_VERSION || '1.21.3',
        auth: 'offline'
    },
    
    // AI設定（index.jsが期待する構造）
    ai: {
        apiKey: ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1000'),
        temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7')
    },
    
    // その他の設定
    debug: process.env.DEBUG === 'true',
    logLevel: process.env.LOG_LEVEL || 'info'
};

// 設定の検証関数
export function validateConfig() {
    if (!config.ai.apiKey) {
        console.error('❌ ANTHROPIC_API_KEY が設定されていません');
        console.log('');
        console.log('以下のいずれかの方法で設定してください:');
        console.log('');
        console.log('方法1: 環境変数として設定');
        console.log('  export ANTHROPIC_API_KEY="your-api-key-here"');
        console.log('');
        console.log('方法2: .envファイルに追加');
        console.log('  echo "ANTHROPIC_API_KEY=your-api-key-here" >> .env');
        console.log('');
        process.exit(1);
    }
    
    console.log('=== 設定情報 ===');
    console.log(`Anthropic Model: ${config.ai.model}`);
    console.log(`Minecraft Server: ${config.minecraft.host}:${config.minecraft.port}`);
    console.log(`Bot Username: ${config.minecraft.username}`);
    console.log('================');
    
    return true;
}

// 自動的に検証を実行
validateConfig();

// デフォルトエクスポート
export default config;
