# Guide Viewer

Markdown のガイドを常時最前面で表示し、目次を固定しつつ現在ステップをハイライトする軽量ビューアである。  

## Features

- サイドバーに目次を常時表示し、現在ステップを強調表示する。
- 小型オーバーレイで「実行中」を表示し、`H` キーで切替可能である。
- プレビュー専用レイアウトを `V` キーまたは `?preview=1` で切替可能である。
- キーボード操作: `N`/`→` 次へ、`P`/`←` 前へ、`D` 完了→次へ、`H` オーバーレイ、`V` プレビュー。
- 中央寄せのオートスクロールと、任意の自動リロード（約3秒間隔）を備える。

## Quick Start

1) Clone
- `git clone <repo-url>`
- `cd guide_viewer`

2) Place Markdown
- `.md` ファイルを `./input/` 配下に配置する（git 管理対象外）。

3) Launch (Chrome app window)
- `./run_guide_viewer.sh`
  - `./guide.md` が無い場合、`./input/*.md` の一覧から選択を促し、  
    選択したファイルへのシンボリックリンク `guide.md` を作成する。

1) Launch (Electron)
- `./run_guide_viewer_electron.sh`
  - 初回は npm により Electron を取得する。  
    起動時の選択フローは Chrome 版と同様。

Notes
- 既定ポートは `8123` である。変更は `-p 9000` のように指定する。起動時のプレビューを無効化するには `--no-preview` を付与する。
- Markdown ファイルを明示指定する場合は `-m ./input/your_guide.md` を用いる。

## Limitations

- 対応 OS は macOS のみである。
- Markdown の解析は簡易であり、以下に限定される。
  - 見出し `#` / `##` / `###`
  - 見出し直下の箇条書き（`- ...` / `* ...`）
  - 太字強調 `**...**` / `__...__`
- 完全な Markdown レンダラではなく、複雑な構文には対応しない。

## Customize & Troubleshoot


詳細なカスタマイズやトラブルシュートは [`CUSTOMIZATION.md`](./CUSTOMIZATION.md) を参照のこと。