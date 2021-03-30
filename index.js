const core = require('@actions/core');
const { Octokit } = require('@octokit/rest')

try {
  // Get token and authenticate octokit to make calls to GitHub's API
  const githubToken = core.getInput('github_token', {required: true});
  const octokit = new Octokit({auth: `token ${githubToken}`});

  // Find a link to a GitHub repository somewhere in the provided text
  const text = core.getInput('text', {required: true});
  const re = /https:\/\/github\.com\/(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]*[A-Za-z0-9_-])\/?.+/;
  const regex = re.exec(text);

  if (!regex) {
    // Couldn't find a repository in the text matching the regex
    core.setFailed('No repo found. Format: https://github.com/owner/repo')
  }

  const {groups: {owner, repo}} = regex;

  core.setOutput('repo', `${owner}/${repo}`);

  // Get requirements from input
  const minStars = parseInt(core.getInput('min_stars'));
  const minWatchers = parseInt(core.getInput('min_watchers'));
  const minContributors = parseInt(core.getInput('min_contributors'));
  const minForks = parseInt(core.getInput('min_forks'));
  const minCommits = parseInt(core.getInput('min_commits'));
  const minCommitsLastYear = parseInt(core.getInput('min_commits_last_year'));
  const minOpenIssues = parseInt(core.getInput('min_open_issues'));

  // Make a call to `repos` endpoint to get data
  const repoData = octokit.repos.get({owner, repo}).then(({data}) => {
    const {stargazers_count, subscribers_count, open_issues_count, forks_count} = data;

    // Check that data passes requirements
    const stars = passCheck(stargazers_count, minStars);
    const watchers = passCheck(subscribers_count, minWatchers);
    const openIssues = passCheck(open_issues_count, minOpenIssues);
    const forks = passCheck(forks_count, minForks);

    // Set output to results
    core.setOutput('stars', stars);
    core.setOutput('watchers', watchers);
    core.setOutput('open_issues', openIssues);
    core.setOutput('forks', forks);

    return [stars, watchers, openIssues, forks];
  }).catch(error =>  {
    console.log(error);

    // Could not find a repo matching the link found in the text
    core.setFailed(`Repo not found: ${owner}/${repo}`);
  });

  // Get the number of contributors
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

  // Get the commit history for the last year
  const commitActivity = octokit.repos.getCommitActivityStats({owner, repo}).then(({data}) => {
    // An array of the weeks of the last year is returned, the results are added together
    const commitsLastYear = passCheck(data.reduce((sum, week) => sum + week.total, 0), minCommitsLastYear);

    core.setOutput('commits_last_year', commitsLastYear);

    return [commitsLastYear]
  });

  // Get the total number of commits
  const commitData = octokit.repos.listCommits({owner, repo, per_page: 1}).then(data => {
    const {link} = data.headers;

    const commits = passCheck(getLastPageNumber(link), minCommits);

    core.setOutput('commits', commits);

    return [commits];
  });

  // Does a check if all requirements have passed
  Promise.all([repoData, contributionData, commitActivity, commitData]).then(results => {
    core.setOutput('final_pass', results.flat().every(({pass}) => pass));
  })

} catch (error) {
  core.setFailed(error.message);
}

/**
 * Workaround for finding the count of some values. There is currently no GitHub API endpoint
 * to find the number of contributors.
 *
 * A solution according to this StackOverflow page is to set the count per page to 1 and look at the link
 * to the number of the last page.
 * https://stackoverflow.com/questions/44347339/github-api-how-efficiently-get-the-total-contributors-amount-per-repository
 *
 * This is the format of the link:
 * "...contributors?per_page=1&anon=true&page=4135>; rel="last""
 *
 * @param link Link to first and last page
 * @returns {number}
 */
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

/**
 * Returns and object with the number of occurrences of a kind, e.g. stars, commits,
 * and if it passes the required number of occurrences.
 *
 * @param count Number of occurrences
 * @param requirement Required number of occurrences
 * @returns {{pass: boolean, count: any}}
 */
function passCheck(count, requirement) {
  return {count, pass: count >= requirement}
}
