# ARPEGGIO 公式サイト

徳島県上板町のドッグカフェ＆ショップ「ARPEGGIO（アルペジオ）」のホームページです。

- `index.html` … ページ本体
- `images/` … 写真・ロゴ・地図

地図データ © OpenStreetMap contributors

## 個別ページ（Google広告のサイトリンク用）

`/indigo/` `/clinic/` `/photo/` `/cafe/` `/rules/` `/access/` は `index.html` の各セクションから自動で作っています。
`index.html` の内容（価格・時間など）を変えたら、次を実行して個別ページにも反映してください。

    python3 tools/build_pages.py
