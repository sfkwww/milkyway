const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/rest')

// Steps:
// 1. Find a github repo in description of PR
// 2. Check number of stars - must be greater than 10
// 3. Check number of commits - must be greater than 100
// 4. Check activity, TODO
// 5. ...
// 6. Profit

try {
  const githubToken = core.getInput('github_token', {required: true});
  const octokit = new Octokit({auth: `token ${githubToken}`});

  const prBody = core.getInput('pr_body', {required: true});
  const re = /https:\/\/github\.com\/(?<owner>\w+)\/(?<repo>\w+)\/?.+/;
  const {groups: {owner, repo}} = re.exec(prBody);

  core.setOutput('repo', `${owner}/${repo}`);

  const minStars = parseInt(core.getInput('min_stars'));
  const minWatchers = parseInt(core.getInput('min_watchers'));
  const minContributors = parseInt(core.getInput('min_contributors'));
  const minForks = parseInt(core.getInput('min_forks'));
  const minCommits = parseInt(core.getInput('min_commits'));
  const minCommitsLastYear = parseInt(core.getInput('min_commits_last_year'));
  const minOpenIssues = parseInt(core.getInput('min_open_issues'));


  octokit.repos.get({owner, repo}).then(({data}) => {
    const {stargazers_count, subscribers_count, open_issues_count, forks_count} = data;
    const stars = parseInt(stargazers_count);
    const watchers = parseInt(subscribers_count);
    const openIssues = parseInt(open_issues_count);
    const forks = parseInt(forks_count);

    core.setOutput('stars', {count: stars, pass: stars >= minStars});
    core.setOutput('watchers', {count: watchers, pass: watchers >= minWatchers});
    core.setOutput('open_issues', {count: openIssues, pass: openIssues >= minOpenIssues});
    core.setOutput('forks', {count: forks, pass: forks >= minForks});
  });

  octokit.repos.listContributors({owner, repo, per_page: 1, anon: true}).then(data => {
    const {link} = data.headers;

    const contributors = getLastPageNumber(link);

    core.setOutput('contributors', {count: contributors, pass: contributors >= minContributors})

  }).catch(error => console.log(error));

  octokit.repos.getCommitActivityStats({owner, repo}).then(({data}) => {
    const commitsLastYear = data.reduce((sum, week) => sum + week.total, 0);

    core.setOutput('commits_last_year', {count: commitsLastYear, pass: commitsLastYear >= minCommitsLastYear});
  });

  octokit.repos.listCommits({owner, repo, per_page: 1}).then(data => {
    const {link} = data.headers;

    const commits = getLastPageNumber(link);

    core.setOutput('commits', {count: commits, pass: commits >= minCommits});
  });


} catch (error) {
  core.setFailed(error.message);
}

function getLastPageNumber(link) {
  let number = '';
  for (let i = link.lastIndexOf('>');i--;) {
    const c = link[i];
    if (isNaN(c))
      break;
    number = c + number;
  }

  return parseInt(number);
}
