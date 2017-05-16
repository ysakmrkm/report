const tokens = require('./tokens.js');
const TogglClient = require('toggl-api');
const toggl = new TogglClient({apiToken: tokens.togglToken});

const date = new Date();
const today = date.getFullYear()+'-'+('0' + (date.getMonth() + 1)).slice(-2)+'-'+date.getDate()

toggl.getTimeEntries(today+'T00:00:00+09:00', today+'T23:59:59+09:00', function(err, timeEntries) {
  console.log(timeEntries);
});
