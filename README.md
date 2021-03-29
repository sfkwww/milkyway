# milkyway
Checks PR requests with a repository link that they fulfill certain activity requirements.

## Inputs

### `github_token`

**Required** The GITHUB_TOKEN secret.

### `pr_body`

**Required** The body of the PR to check.

### `pr_id`
**Required** The PR number where the output is commented.

### `branch`
**Required** Base branch of the PR. Default is main.

## Outputs

### `repo`

GitHub repository mentioned in `pr_body` if any. 

### `stars`
Number of stars for the repository.

### `watchers`
Number of watchers of the repository.

### `open_issues`
Number of open issues the repository has.

### `contributors`
Number of contributors, including anonymous contributors.

## Example usage


