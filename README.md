# milkyway
Parses a body of text for a repository link and then checks that they fulfill certain activity requirements. The results are returned as output in the workflow.

## Inputs

### `github_token`

**Required** The GITHUB_TOKEN secret.

### `text`

**Required** The text which is parsed for a repository.

### Minimum Requirements
The minimum amount of a specific stat that is required for the action to pass.

The following requirement inputs can be passed into the action, the default is 0:
`min_stars`,
`min_watchers`,
`min_contributors`,
`min_forks`,
`min_commits`,
`min_commits_last_year`,
`min_open_issues`

## Outputs

### `repo`

GitHub repository mentioned in `pr_body` if any. 

### Stats Output
The stats for the repository are returned with the following format:

```
stars: {
  count: 10,
  pass: true
}
```

Where pass is if the  specific stat met the input requirements and count is the actual number for the repository.

The following output stats are returned: 
`stars`, `watchers`, `contributors`, `forks`, `commits`, `commits_last_year`, `open_issues`

**Note:** The result is returned as a string and needs to be parsed as JSON in order to access the object values. For example we used `fromJSON` to access the values in an action script.

### `final_pass`
The aggregated result of all the stat checks which signifies if the repo passes the checks or not.

### Basic Usage
This action only saves the stats to the workflow output and doesn't actually do anything with them. We recommend using another github action following this such as github-script to create a comment with the stats. In this case the stats would be saved in `steps.index.outputs`.

```
name: Repo Check
on:
  pull_request:
    branches: [main]
    
jobs:
  check-repo-activity:
    runs-on: ubuntu-latest
    name: PR activity check
    steps:
    - name: Run action
      id: index
      uses: sfkwww/milkyway@v1
      with:
        github_token: ${{ secrets.TOKEN }}
        text: ${{ github.event.pull_request.body }}
        min_stars: 10
        min_commits: 100
```

### Example Usage for DevOps Course
When a TA lables a pull request with `contribution_to_opensource` the action will run and comment the PR with the repository stats. It will also pass or fail the merge check based on if the repository passes all of the checks.


The github-script action created by the official Github Actions team is used to comment on the PR after our action produces the stats. It also fails the check if some stats didn't meet the requireement with `core.setFailed`.
```
name: Open Source Activity Check
on:
  pull_request:
    types:
      - labeled
    branches: [ 2021 ]

jobs:
  check-repo-activity-for-pr:
    if: github.event.label.name == 'contribution_to_opensource'
    runs-on: ubuntu-latest
    name: PR activity check
    steps:
    - name: Run action
      id: index
      uses: sfkwww/milkyway@v1
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        text: ${{ github.event.pull_request.body }}
        min_stars: 10
        min_watchers: 10
        min_contributors: 10
        min_forks: 1
        min_commits: 100
        min_commits_last_year: 10
        min_open_issues: 10
    - name: Comment the results
      uses: actions/github-script@v3
      with:
        github-token: ${{secrets.GITHUB_TOKEN}}
        script: |
          github.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `
            [ ${{steps.index.outputs.repo}} ]
            -----------------------
            | Stat  |  Number |  Pass | 
            |---|---|---|
            |Stars ⭐              | ${{fromJSON(steps.index.outputs.stars).count}}             | ${{ fromJSON('["❌", "✔️"]')[fromJSON(steps.index.outputs.stars).pass] }}   |
            |Commits 📦            | ${{fromJSON(steps.index.outputs.commits).count}}           | ${{ fromJSON('["❌", "✔️"]')[fromJSON(steps.index.outputs.commits).pass] }} |
            |Commits Last Year ⏱️  | ${{fromJSON(steps.index.outputs.commits_last_year).count}} | ${{ fromJSON('["❌", "✔️"]')[fromJSON(steps.index.outputs.commits_last_year).pass] }} |
            |Watchers 👀           | ${{fromJSON(steps.index.outputs.watchers).count}}          | ${{ fromJSON('["❌", "✔️"]')[fromJSON(steps.index.outputs.watchers).pass] }} |
            |Contributors 🧑🏻‍🤝‍🧑🏻       | ${{fromJSON(steps.index.outputs.contributors).count}}      | ${{ fromJSON('["❌", "✔️"]')[fromJSON(steps.index.outputs.contributors).pass] }} |
            |Forks 🍴               | ${{fromJSON(steps.index.outputs.forks).count}}             | ${{ fromJSON('["❌", "✔️"]')[fromJSON(steps.index.outputs.forks).pass] }} |
            |Open Issues 🟢        | ${{fromJSON(steps.index.outputs.open_issues).count}}       | ${{ fromJSON('["❌", "✔️"]')[fromJSON(steps.index.outputs.open_issues).pass] }} |
            `
          })
          if (!${{steps.index.outputs.final_pass}}) {
            core.setFailed('The repository did not meet the minimum requirements')
          }
```

*Note:* `fromJSON('["❌", "✔️"]')[boolean] }}` is used as a workaround since ternary operators don't exist for this context.
