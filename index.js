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

  const {data} = octokit.repos.get({owner, repo});

  console.log(data)

  //const {startgazers_count, watchers_count, open_issues_count} = data;

  //const contributors = octokit.repos.listContributors({owner, repo});

} catch (error) {
  core.setFailed(error.message);
}
