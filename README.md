# Minecraft AI Agent

Claude APIを使用してMinecraftボットを自然言語で制御するAIエージェントシステムです。

## 🎯 機能

- **自然言語コマンド解析**: Claude APIを使用してユーザーの指示を解釈
- **Minecraftボット制御**: Mineflayerライブラリを使用したボット操作
- **タスク実行システム**: 移動、採掘、アイテム収集、チャットなどの自動実行
- **リアルタイム状態監視**: ボットの位置、体力、インベントリの監視
- **コマンドラインインターフェース**: 直感的な操作環境

## 🚀 セットアップ

### 1. 前提条件

- **Node.js** v16.0.0以上
- **Minecraft Java Edition** (ローカルまたはLANサーバー)
- **Anthropic Claude API キー**

### 2. プロジェクトのセットアップ

```bash
# 依存関係のインストール
npm install

# 環境設定ファイルをコピー
cp .env.example .env
```

### 3. 環境変数の設定

`.env` ファイルを編集して以下の設定を行います：

```env
# Claude API設定
ANTHROPIC_API_KEY=your_api_key_here

# Minecraft サーバー設定  
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=AIBot
MINECRAFT_VERSION=1.20.1
MINECRAFT_AUTH=offline
```

### 4. Minecraftの準備

#### シングルプレイヤーワールドの場合：
1. Minecraftでワールドを開く
2. **ESCキー** → **"LANに公開"** をクリック
3. 表示されたポート番号を `.env` の `MINECRAFT_PORT` に設定
4. **"LANワールドを公開"** をクリック

#### マルチプレイヤーサーバーの場合：
1. サーバーのIPアドレスを `MINECRAFT_HOST` に設定
2. サーバーのポート番号を `MINECRAFT_PORT` に設定

## 🎮 使用方法

### 起動

```bash
npm start
```

### コマンド例

```
🎮 指示> 木を5本集めて
🎮 指示> 前に10ブロック進んで
🎮 指示> 石の家を建てて
🎮 指示> こんにちはとチャットで言って
```

### システムコマンド

- `status` - 現在の状態を確認
- `history` - 実行履歴を表示
- `stop` - 緊急停止
- `help` - ヘルプを表示
- `clear` - 画面をクリア
- `exit` - プログラム終了

## 🏗️ プロジェクト構造

```
MineAI/
├── src/
│   ├── ai/
│   │   └── llmInterface.js      # Claude API インターフェース
│   ├── bot/
│   │   └── minecraftBot.js      # Minecraftボット制御
│   ├── config.js                # 設定管理
│   ├── taskExecutor.js          # タスク実行システム
│   └── index.js                 # メインエントリーポイント
├── package.json
├── .env.example                 # 環境変数テンプレート
└── README.md
```

## 🔧 技術スタック

- **Node.js** - JavaScript ランタイム
- **Mineflayer** - Minecraftボット制御ライブラリ
- **Anthropic Claude API** - LLM統合
- **mineflayer-pathfinder** - 高度なナビゲーション
- **dotenv** - 環境変数管理

## 🎯 利用可能なアクション

| アクション | 説明 | パラメータ例 |
|-----------|------|------------|
| `move` | 指定座標への移動 | `{x: 10, y: 64, z: 20}` |
| `mine` | ブロックの破壊 | `{blockType: "oak_log"}` |
| `collect` | アイテム収集 | `{itemType: "wood", amount: 5}` |
| `chat` | チャットメッセージ送信 | `{message: "こんにちは"}` |
| `place` | ブロック設置 | `{blockType: "stone", position: {...}}` |
| `craft` | アイテムクラフト | `{item: "wooden_pickaxe", amount: 1}` |

## 🐛 トラブルシューティング

### 接続エラーが発生する場合
1. Minecraftのワールドが「LANに公開」されているか確認
2. ポート番号が正しく設定されているか確認
3. ファイアウォールの設定を確認

### LLM解析エラーが発生する場合
1. Claude API キーが正しく設定されているか確認
2. インターネット接続を確認
3. API使用制限に達していないか確認

### ボットが動作しない場合
1. ボットがゲーム内でスポーンされているか確認
2. ボットの体力が0でないか確認
3. 実行しようとしているアクションが可能な状態か確認

## 📝 ログ

アプリケーションは詳細なログを出力します：

- **🤖** システム状態
- **✅** 成功した操作
- **❌** 失敗した操作
- **⚠️** 警告メッセージ
- **🧠** LLM解析状況

## 🚀 今後の拡張予定

- [ ] ブロック設置機能の完全実装
- [ ] クラフト機能の実装
- [ ] 複雑な建築物の自動建設
- [ ] インベントリ管理の最適化
- [ ] マルチボット協調作業
- [ ] Webインターフェースの追加

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストや課題報告を歓迎します。