// configss
const configs = require('./config.js');

// Trello
const trelloClient = require("node-trello");
const trello = new trelloClient(configs.trello.key, configs.trello.token);

// Redmine
const redmineClient = require('node-redmine');
const hostname = process.env.REDMINE_HOST || configs.redmine.hostname;
const config = { apiKey: process.env.REDMINE_APIKEY || configs.redmine.key };
const redmine = new redmineClient(hostname, config);

// Toggl
const TogglClient = require('toggl-api');
const toggl = new TogglClient({apiToken: configs.togglToken});

let tasks = [];

// # Trello ボードのカードチェック
Promise.resolve()
.then(()=> {
  // 1. ボード情報取得
  return new Promise((resolve, reject)=> {
    trello.get('/1/members/me/boards', function(err, data) {
      if (err) {
        reject(err);
        return;
      }

      let board = data.filter((val) => {
        return val.id === configs.trello.boardId;
      });

      resolve(board[0]);
    });
  });
}).then((data)=> {
  // 2. ボードからリスト取得
  return new Promise((resolve, reject)=> {
    trello.get('/1/boards/'+data.id+'/lists', function(err, data) {
      if (err) {
        reject(err);
        return;
      }

      let list = data.filter((val) => {
        return val.name === configs.trello.listName;
      });

      resolve(list[0]);
    });
  });
}).then((data)=> {
  // 3. リストからカード取得
  return new Promise((resolve, reject)=> {
    trello.get('/1/lists/'+data.id+'/cards', function(err, data) {
      if (err) {
        reject(err);
        return;
      }

      data.forEach((current, index, array)=> {
        tasks.push(current.name);
      })

      resolve(tasks);
    });
  });
}).then((data)=> {
  console.log(data);
});

// TODO
// ## 追加されたカードを Redmine のタスク管理用プロジェクトでチケット発行
//
// # Toggl で作業時間計測
//
// ## 初回計測時 1-1 で発行したチケットに子チケットを新規発行
//
// ## Toggl Button で Trello のカードで作業時間計測開始
//
// ## Time Entry 追加毎に Redmine の 2-1 で発行したチケットに作業時間追加
//
// # Redmine で作業時間計測
//
// ## 2-1 で発行したチケットの題名変更([時間] タスク名)
