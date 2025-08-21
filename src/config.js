import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

/**
 * アプリケーション設定
 */
export const config = {
  // Minecraft サーバー設定
  minecraft: {
    host: process.env.MINECRAFT_HOST || 'localhost',
    port: parseInt(process.env.MINECRAFT_PORT) || 25565,
    username: process.env.MINECRAFT_USERNAME || 'AIBot',
    version: process.env.MINECRAFT_VERSION || '1.20.1',
    auth: process.env.MINECRAFT_AUTH || 'offline'
  },
  
  // AI (Claude) 設定
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229',
    maxTokens: 1000,
    timeout: 30000 // 30秒
  },
  
  // ボット動作設定
  bot: {
    maxActionTimeout: 30000, // 30秒
    searchRadius: 32,
    collectRadius: 10,
    pathfindingTimeout: 30000
  }
};

/**
 * 設定の検証
 */
export function validateConfig() {
  const errors = [];
  
  if (!config.ai.apiKey) {
    errors.push('ANTHROPIC_API_KEY が設定されていません');
  }
  
  if (!config.minecraft.host) {
    errors.push('MINECRAFT_HOST が設定されていません');
  }
  
  if (!config.minecraft.port || isNaN(config.minecraft.port)) {
    errors.push('MINECRAFT_PORT が正しく設定されていません');
  }
  
  if (errors.length > 0) {
    throw new Error('設定エラー:\n' + errors.join('\n'));
  }
}