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

  const repoData = octokit.repos.get({owner, repo}).then(({data}) => {
    const {stargazers_count, subscribers_count, open_issues_count, forks_count} = data;

    const stars = passCheck(stargazers_count, minStars);
    const watchers = passCheck(subscribers_count, minWatchers);
    const openIssues = passCheck(open_issues_count, minOpenIssues);
    const forks = passCheck(forks_count, minForks);

    core.setOutput('stars', stars);
    core.setOutput('watchers', watchers);
    core.setOutput('open_issues', openIssues);
    core.setOutput('forks', forks);

    return [stars, watchers, openIssues, forks];
  });

  const contributionData = octokit.repos.listContributors({owner, repo, per_page: 1, anon: true}).then(data => {
    const {link} = data.headers;

    const contributors = passCheck(getLastPageNumber(link), minContributors);

    core.setOutput('contributors', contributors);

    return [contributors];
  }).catch(error => {
        console.log(error);

        // Can fail on very large repositories, like torvalds/linux, which has 5000+ contributors on GitHub.com
        const contributors = {count: '5000+', pass: true};
        core.setOutput('contributors', contributors);

        return Promise.resolve(contributors);
  });

  const commitActivity = octokit.repos.getCommitActivityStats({owner, repo}).then(({data}) => {
    const commitsLastYear = passCheck(data.reduce((sum, week) => sum + week.total, 0), minCommitsLastYear);

    core.setOutput('commits_last_year', commitsLastYear);

    return [commitsLastYear]
  });

  const commitData = octokit.repos.listCommits({owner, repo, per_page: 1}).then(data => {
    const {link} = data.headers;

    const commits = passCheck(getLastPageNumber(link), minCommits);

    core.setOutput('commits', commits);

    return [commits];
  });

  Promise.all([repoData, contributionData, commitActivity, commitData]).then(results => {
    core.setOutput('final_pass', results.flat().every(({pass}) => pass));
  })

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

function passCheck(count, requirement) {
  return {count, pass: count >= requirement}
}
