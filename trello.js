const tokens = require('./tokens.js');
const trelloClient = require("node-trello");
const trello = new trelloClient(tokens.trello.key, tokens.trello.token);

// ボード
trello.get('/1/members/me/boards', function(err, data) {
  if (err) throw err;
  let board = data.filter((val) => {
    return val.id === tokens.trello.boardId;
  });

  // リスト
  trello.get('/1/boards/'+tokens.trello.boardId+'/lists', function(err, data) {
    if (err) throw err;
    let list = data.filter((val) => {
      return val.name === tokens.trello.listName;
    });

    list = list[0];

    // 自分用リストのカード
    trello.get('/1/lists/'+list['id']+'/cards', function(err, data) {
      if (err) throw err;
      console.log(data)
    });
  });
});
