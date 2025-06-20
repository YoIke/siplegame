# 1対1ミニゲーム対戦

リアルタイムで対戦できるミニゲームプラットフォームです。Socket.ioを使用して1対1でのマルチプレイヤーゲームとチャット機能を実装しています。

## 🎮 収録ゲーム

### 1. 数字当てゲーム 🎯
- **ルール**: 1〜100の間でランダムに選ばれた数字を当てる
- **ヒント**: 「大きい」「小さい」「正解」で判定
- **勝利条件**: 先に正解したプレイヤーの勝利
- **最大試行回数**: 10回

### 2. ヒットアンドブロー 🌈
- **ルール**: 4つの色の組み合わせを当てる推理ゲーム
- **色の種類**: 赤、青、緑、黄、ピンク、白の6色
- **重複なし**: 正解には同じ色は入らない（例：赤、青、緑、白）
- **ヒント**: 
  - **Hit**: 位置と色が正しい
  - **Blow**: 色は正しいが位置が違う
- **勝利条件**: 4つ全てHitで勝利
- **最大試行回数**: 10回

## 🌟 機能

- **ゲーム選択**: 2つのゲームから選択可能
- **リアルタイムマッチメイキング**: 自動で対戦相手を見つける
- **ターン制ゲームプレイ**: 交互に推理を行う対戦
- **リアルタイムチャット**: ゲーム中に相手とコミュニケーション
- **レスポンシブデザイン**: PC・スマホ対応
- **再戦機能**: 同じ相手ともう一度遊べる

## 🚀 ローカル開発

### 必要な環境
- Node.js 16.0.0以上
- npm

### セットアップ
```bash
# 依存関係をインストール
npm install

# 開発サーバー起動（自動再起動）
npm run dev

# または通常起動
npm start
```

ブラウザで `http://localhost:3000` を開いてゲームを始められます。

## ☁️ Railway へのデプロイ

1. GitHubにプッシュ
2. Railway.appでアカウント作成
3. GitHub連携でリポジトリを選択
4. 自動デプロイが開始されます

## 🛠️ 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **バックエンド**: Node.js, Express.js
- **リアルタイム通信**: Socket.io
- **デプロイ**: Railway (Docker対応)

## 📁 ファイル構成

```
siplegame/
├── server.js          # サーバーサイドメインファイル
├── package.json       # 依存関係とスクリプト
├── Dockerfile         # Railway用Docker設定
├── public/            # 静的ファイル
│   ├── index.html     # メインHTML
│   ├── style.css      # スタイルシート
│   └── script.js      # クライアントサイドJS
└── README.md          # このファイル
```

## 🎯 ゲームの遊び方

### 数字当てゲーム
1. ゲーム選択画面で「数字当てゲーム」を選択
2. 対戦相手が見つかったら「準備完了」をクリック
3. 自分のターンで1〜100の数字を入力
4. 「大きい」「小さい」のヒントを元に推理
5. 先に正解したプレイヤーの勝利！

### ヒットアンドブロー
1. ゲーム選択画面で「ヒットアンドブロー」を選択
2. 対戦相手が見つかったら「準備完了」をクリック
3. 自分のターンで6色から4つの色を選択（重複なし）
4. Hit（位置と色が正しい）とBlow（色のみ正しい）のヒントで推理
5. 4つ全てHitで勝利！

## 🎲 ゲーム戦略

### 数字当てゲーム
- **二分探索**: 50から始めて範囲を半分ずつ絞る
- **相手の予想を観察**: 相手がどの数字を試したかメモする
- **確実な範囲**: ヒントから確実に分かる範囲を把握する

### ヒットアンドブロー
- **初回**: 異なる4色で様子見（例：赤、青、緑、黄）
- **Hit分析**: Hitが出た位置の色は固定
- **Blow活用**: Blowの色を他の位置で試す
- **除外法**: 使われていない色を特定して絞り込む
- **重複なし**: 同じ色は使われないので効率よく絞り込める

## 🌐 対応ブラウザ

- Google Chrome (推奨)
- Mozilla Firefox
- Microsoft Edge
- Safari (iOS/macOS)

## 📱 モバイル対応

- レスポンシブデザインでスマートフォンにも対応
- タッチ操作でも快適にプレイ可能

## 🔧 カスタマイズ

### 新しいゲームの追加
1. `server.js`に新しいゲームクラスを作成
2. `public/index.html`にゲームUIを追加
3. `public/script.js`にゲームロジックを実装
4. `public/style.css`にスタイルを追加

### 設定変更
- 最大試行回数: サーバーサイドの`maxAttempts`を変更
- 色の種類: `HitAndBlowRoom`クラスの`colors`配列を変更（現在：赤、青、緑、黄、ピンク、白）
- 数字の範囲: `NumberGuessRoom`クラスの範囲設定を変更

## 🐛 トラブルシューティング

### よくある問題

**接続できない**
- ブラウザを更新してみてください
- ネットワーク接続を確認してください

**ゲームが開始されない**
- 両プレイヤーが「準備完了」をクリックしているか確認
- ページを再読み込みしてみてください

**操作が効かない**
- 自分のターンかどうか確認してください
- ブラウザの開発者ツールでエラーがないか確認

## 📞 サポート

質問や不具合報告は以下へ：
- GitHub Issues
- メール: [your-email@example.com]

## 📜 ライセンス

MIT License

## 🙏 謝辞

- Socket.io チーム
- Express.js チーム
- Railway プラットフォーム

---

楽しいゲーム体験をお楽しみください！ 🎮✨
