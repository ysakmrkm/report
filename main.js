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

let cards = [];
let tasks = [];

let yesterday = new Date().setDate(new Date().getDate() - 1);
yesterday = new Date(yesterday);

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
        cards.push({
          'title': current.name,
          'date': new Date(1000*parseInt(current.id.substring(0,8),16))
        });
      })

      resolve(cards);
    });
  });
}).then((data)=> {
  // # 追加されたカードを Redmine のタスク管理用プロジェクトでチケット発行
  // 1. Redmine のチケットチェック

  return new Promise((resolve, reject)=> {
    redmine.issues({limit: 100, project_id: configs.redmine.projectId}, (err, data)=> {
      if (err) throw err;

      topTasks = data.issues.filter((issue)=> {
        return issue.parent === undefined
      });

      topTasks.forEach((current, index, array)=> {
        tasks.push({
          'title': current.subject,
          'date': current.created_on
        });
      })

      resolve(tasks);
    });
  });
}).then((data)=> {
  // 2. Trello のカードと比較

  newIssues = [];

  return new Promise((resolve, reject)=> {
    cards.forEach((currentCard, cardIndex, cardArray)=> {
      taskExist = false;

      tasks.forEach((currentTask, taskIndex, taskArray)=> {
        if(currentTask.title.indexOf(currentCard.title) !== -1) {
          taskExist = true;
        }
      });

      let date = new Date(currentCard.date).getTime();

      // ## 作成日が24時間以内のタスクをチェック
      if(!taskExist && date >= yesterday.getTime()) {
        newIssues.push(currentCard);
      }
    });

    resolve(newIssues);
  });
}).then((data)=> {
  // 3. 無ければチケット発行

  let newIssues = data;

  // ## ユーザーID取得
  redmine.current_user({include: "memberships,groups"}, function(err, data) {
    if (err) throw err;

    newIssues.forEach((currentIssue, issueIndex, issueArray)=> {
      let issue = {
        'issue': {
          project_id: configs.redmine.projectId,
          assigned_to_id: data.user.id,
          subject: currentIssue.title,
        }
      };

      // ## チケット発行
      redmine.create_issue(issue, (err, data)=> {
        if (err) {
          console.log("Error: " + err.message);
          return;
        }
      });
    });
  });
});

// TODO
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
