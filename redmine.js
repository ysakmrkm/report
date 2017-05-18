const tokens = require('./tokens.js');
const redmineClient = require('node-redmine');
const hostname = process.env.REDMINE_HOST || tokens.redmine.hostname;
const config = {
  apiKey: process.env.REDMINE_APIKEY || tokens.redmine.key
};

const redmine = new redmineClient(hostname, config);

redmine.issues({limit: 100, project_id: tokens.redmine.projectId}, (err, data)=> {
  if (err) throw err;

  let tasks = data.issues.filter((issue)=> {
    return issue.parent === undefined
  });

  console.log(tasks);

  console.log('total_count: ' + tasks.length);
});
