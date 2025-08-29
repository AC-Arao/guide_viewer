# Guide Viewer — Customization & Tips

本書は外観（スタイル）や挙動の調整項目、運用上のTipsをまとめたものである。  
基本的な使い方と制限は README を参照のこと。

## Styling

- テーマ変数は `styles.css` の `:root` に定義する。
  - `--bg`, `--panel`, `--text`, `--muted`, `--accent` など。
- 太字強調（`**...**` / `__...__`）の色は次で調整する。
  - `.md-strong { color: #f2d98d; font-weight: 800; }`
- プレビュー専用時の下線は次で調整する。
  - `.preview-only .section.l1 > h1` および `.preview-only .section.l2 > h2`
- ドラッグハンドル（Electron・プレビュー専用）の高さは次で調整する。
  - `:root` 内の `--drag-handle-height`

## Behavior

- オーバーレイ切替: `H` キーまたはツールバーのボタンで切替する。
- プレビュー専用: `V` キーで切替、もしくは URL に `?preview=1` を付与する。
- ナビゲーション: `N`/`→` で次へ、`P`/`←` で前へ、`D` で完了マーク後に次へ進む。
- 自動リロード: チェックボックスを有効にすると約3秒ごとに `guide.md` を再読込する。
- セクション（プレビュー専用時）をクリックすると当該ステップにフォーカスし、画面端の領域クリックで前後に移動する。

## File Flow

- ビューアは `index.html` と同じディレクトリにある `guide.md` を取得する。
- 起動スクリプトは `./guide.md` が無い場合、`./input/*.md` から選択したファイルへのシンボリックリンクを作成する。
- Electron 版は HTTP 取得が失敗した場合、preload 経由でディスク上の `guide.md` を読み込むフォールバックを行う。

## Troubleshooting

- 何も表示されない／画面が暗い
  - DevTools を開き、`[guide_viewer] loading:` のログ有無を確認する。
  - 見出しが無い場合は注意文とともに生の Markdown を表示する仕様である。
- 404 Not Found
  - `guide_viewer/guide.md` の存在を確認する。起動スクリプトを再実行して symlink を作成する。
- 常時最前面にならない
  - Electron 版を使用する。Chrome の `--always-on-top` は macOS で不安定な場合がある。
