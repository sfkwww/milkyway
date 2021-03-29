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

  core.setOutput('repo', `${owner}/${repo}`)

  octokit.repos.get({owner, repo}).then(({data}) => {
    const {stargazers_count, subscribers_count, open_issues_count, forks_count} = data;

    core.setOutput('stars', stargazers_count);
    core.setOutput('watchers', subscribers_count);
    core.setOutput('open_issues', open_issues_count);
    core.setOutput('forks', forks_count);
  });

  octokit.repos.listContributors({owner, repo, per_page: 1, anon: true}).then(data => {
    const {link} = data.headers;

    let contributors = '';
    for (let i = link.lastIndexOf('>');i--;) {
      const c = link[i];
      if (isNaN(c))
        break;
      contributors = c + contributors;
    }

    core.setOutput('contributors', contributors)

  }).catch(error => console.log(error));


} catch (error) {
  core.setFailed(error.message);
}
