# milkyway
Checks PR requests with a repository link that they fulfill certain activity requirements.

## Inputs

### `github_token`

**Required** The GITHUB_TOKEN secret.

### `pr_body`

**Required** The body of the PR to check.

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
id: {
  id_count: 10,
  pass: true
}
```

Where pass is if the  specific stat met the input requirements and count is the actual number for the repository.

The following output stats are returned: 
`stars`, `watchers`, `contributors`, `forks`, `commits`, `commits_last_year`, `open_issues`

## Example usage


