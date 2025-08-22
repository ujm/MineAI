// test-version.js
// 適切なMinecraftバージョンを見つけるためのテストスクリプト

import mineflayer from 'mineflayer';
import dotenv from 'dotenv';

dotenv.config();

// 試すバージョンのリスト（新しい順）
const versions = [
    '1.21.3',
    '1.21.1', 
    '1.21',
    '1.20.6',
    '1.20.4',
    '1.20.1',
    false  // falseにすると自動検出
];

const host = process.env.MC_HOST || '172.28.128.1';
const port = parseInt(process.env.MC_PORT || '25565');

console.log(`=== Minecraftバージョン互換性テスト ===`);
console.log(`接続先: ${host}:${port}`);
console.log(`サーバーバージョン: 1.21.8`);
console.log('');

async function testVersion(version) {
    return new Promise((resolve) => {
        console.log(`テスト中: ${version || '自動検出'}`);
        
        const options = {
            host: host,
            port: port,
            username: 'VersionTestBot',
            auth: 'offline',
            hideErrors: true,
            logErrors: false,
            connectTimeout: 10000
        };
        
        // バージョンが指定されている場合のみ追加
        if (version) {
            options.version = version;
        }
        
        const bot = mineflayer.createBot(options);
        
        let timeoutId = setTimeout(() => {
            console.log(`  ❌ タイムアウト`);
            bot.quit();
            resolve(false);
        }, 10000);
        
        bot.on('spawn', () => {
            clearTimeout(timeoutId);
            console.log(`  ✅ 接続成功！このバージョンが使用可能です: ${version || '自動検出'}`);
            bot.quit();
            resolve(true);
        });
        
        bot.on('error', (err) => {
            clearTimeout(timeoutId);
            if (err.message.includes('version')) {
                console.log(`  ❌ バージョン不一致: ${err.message.split(',')[0]}`);
            } else {
                console.log(`  ❌ エラー: ${err.message}`);
            }
            resolve(false);
        });
        
        bot.on('kicked', (reason) => {
            clearTimeout(timeoutId);
            const reasonStr = JSON.stringify(reason);
            if (reasonStr.includes('incompatible')) {
                console.log(`  ❌ 非互換バージョン`);
            } else {
                console.log(`  ⚠️ キック: ${reasonStr}`);
            }
            resolve(false);
        });
        
        bot.on('end', () => {
            clearTimeout(timeoutId);
            resolve(false);
        });
    });
}

async function findCompatibleVersion() {
    for (const version of versions) {
        const success = await testVersion(version);
        if (success) {
            console.log('');
            console.log('=== 結果 ===');
            console.log(`推奨バージョン: ${version || '自動検出モード'}`);
            console.log('');
            console.log('.envファイルを以下のように更新してください:');
            if (version) {
                console.log(`MC_VERSION=${version}`);
            } else {
                console.log('MC_VERSIONの行を削除（自動検出を使用）');
            }
            return;
        }
        console.log('');
    }
    
    console.log('=== 結果 ===');
    console.log('互換性のあるバージョンが見つかりませんでした。');
    console.log('');
    console.log('解決策:');
    console.log('1. mineflayerとminecraft-protocolを最新版に更新:');
    console.log('   npm update mineflayer minecraft-protocol minecraft-data');
    console.log('');
    console.log('2. または、サーバーのバージョンを下げる');
}

// 実行
findCompatibleVersion().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('予期しないエラー:', err);
    process.exit(1);
});
