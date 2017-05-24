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

const date = new Date();

// チェック間隔 5分
const intervalSec = 5 * 60 * 1000;

// 前回チェック時間
let beforeChecked = date.getTime() - intervalSec;
beforeChecked = new Date(beforeChecked);

// Trello ボードのカードチェック
getTrelloCards = ()=> {
  cards = [];

  return Promise.resolve()
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

        console.log(cards)

        resolve(cards);
      });
    });
  });
}

// # Trello ボードのカードチェック / Redmine プロジェクトの issue チェック・発行
createNewIssues = ()=> {
  tasks = [];

  getTrelloCards().then((data)=> {
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

        // ## 作成日が前回チェック以降のタスクをチェック
        if(!taskExist && date >= beforeChecked.getTime()) {
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

  setTimeout(createNewIssues, intervalSec);
}

// createNewIssues();

// # Toggl で作業時間計測
// ## 1-3 のカードにコメントを書いたら 2-3 で発行したチケットに子チケットを新規発行
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
  // 3. リストからコメントを取得
  return new Promise((resolve, reject)=> {
    trello.get('/1/lists/'+data.id+'/actions', function(err, data) {
      if (err) {
        reject(err);
        return;
      }

      let comments = data.filter((val) => {
        let date = new Date(val.date).getTime();

        return val.type === 'commentCard' && date >= beforeChecked.getTime();
      });

      resolve(comments);
    });
  });
}).then((data)=> {
  // 3. コメントからカードを取得
  data.forEach((currentAction, actionIndex, actionArray)=> {
    return new Promise((resolve, reject)=> {
      trello.get('/1/cards/'+currentAction.data.card.id, function(err, data) {
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    }).then((data)=> {
      // 親チケット取得
      return new Promise((resolve, reject)=> {
        redmine.issues({subject: data.name}, (err, data)=> {
          if (err) {
            reject(err);
            return;
          }

          resolve(data);
        });
      });
    }).then((data)=> {
      // 子チケット発行
      let issue = {
        'issue': {
          project_id: configs.redmine.projectId,
          parent_issue_id: data.issues[0].id,
          assigned_to_id: data.issues[0].assigned_to.id,
          subject: currentAction.data.text,
        }
      };

      return new Promise((resolve, reject)=> {
        redmine.create_issue(issue, (err, data)=> {
          if (err) {
            reject(err);
            return;
          }

          console.log(data);

          resolve(data);
        });
      });
    });
  });
});

// TODO
// ## Toggl Button で Trello のカードで作業時間計測開始
// ## Time Entry 追加毎に Redmine の 2-1 で発行したチケットに作業時間追加
const today = date.getFullYear()+'-'+('0' + (date.getMonth() + 1)).slice(-2)+'-'+date.getDate()

toggl.getTimeEntries(today+'T00:00:000', today+'T23:59:59', function(err, timeEntries) {
  timeEntries.forEach((currentTimeEntry, timeEntryIndex, timeEntryArray)=> {
    entryTime = new Date(currentTimeEntry.at);

    if(entryTime.getTime() >= beforeChecked.getTime()) {
      console.log(currentTimeEntry)
    }
  });
});

// # Redmine で作業時間計測
//
// ## 2-1 で発行したチケットの題名変更([時間] タスク名)
