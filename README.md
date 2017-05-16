# Goal

タスク記録全般を自動化したい

# Web Services

- Trello
- Toggl
- Redmine

# Flow

1. Trello の自分用ボードにカード追加
    1. 追加されたカードを Redmine のタスク管理用プロジェクトでチケット発行
2. Toggl で作業時間計測
    1. 初回計測時 `1-1` で発行したチケットに子チケットを新規発行
    2. Toggl Button で Trello のカードで作業時間計測開始
    3. Time Entry 追加毎に Redmine の `2-1` で発行したチケットに作業時間追加
3. Redmine で作業時間計測
    1. `2-1` で発行したチケットの題名変更(`[時間] タスク名`)
