# Kyro workflow

Track scoped work in issues. Add an owner and acceptance criteria before applying `status:ready`.
Use `status:in-progress` when work begins and `status:blocked` with a linked dependency when it cannot continue.
Remove obsolete status labels when changing status. Link pull requests to their issues.

Repository maintenance labels new issues, labels automation/dependency/documentation PRs, and updates one weekly health issue each Monday around 09:23 Jamaica time. It never closes stale work or merges PRs.

Organization configuration and private reporting live in KyroPvp/automation. The project synchronizer needs its documented credential; repository maintenance uses only GitHub's built-in token.

Enable Codex cloud code review for this repository in Codex settings. `@codex review` requests a review once the organization installation is enabled. No OpenAI key is needed by the deterministic maintenance workflow.

PHPStan, full plugin packaging, and PHP regression CI require reproducible access to private sibling dependencies and the shared test harness. Do not use `--ignore-platform-reqs` to hide missing PocketMine extensions. GitHub Actions dependency updates are enabled where a configuration did not already exist. Composer updates need a separately configured private registry credential.
