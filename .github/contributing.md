# Contributing to H5P-Nodejs-Library

Welcome and thank you for your interest in contributing to H5P-Nodejs-Library,
we really appreciate it. Lumi tries to improve education wherever it is possible
by providing a software that connects teachers with their students. Every help
is appreciated and welcome.

There are many ways to contribute:

* reporting bugs
* feature suggestions
* fixing bugs
* submitting pull requests for enhancements

## Reporting Bugs, Asking Questions, Sending Suggestions

Just file a GitHub issue, that’s all. If you want to prefix the title with a
“Question:”, “Bug:”, or the general area of the application, that would be
helpful, but it is by no means mandatory. If you have write access, add the
appropriate labels.

If you’re filing a bug, specific steps to reproduce are helpful. Please include
the URL of the page that has the bug, along with what you expected to see and
what happened instead.

## Pull Requests

### Code Reviews

Code reviews are an important part of our workflow. They help to keep code
quality consistent, and they help every person learn and improve over time. We
want to make you the best contributor you can be.

Every PR should be reviewed and approved by someone other than the author, even
if the author has write access. Fresh eyes can find problems that can hide in
the open if you’ve been working on the code for a while.

The recommended way of finding an appropriate person to review your code is by
[blaming](https://help.github.com/articles/using-git-blame-to-trace-changes-in-a-file/)
one of the files you are updating and looking at who was responsible for
previous commits on that file.

Then, you may ask that person to review your code by mentioning their GitHub
username on the PR comments like this:

```text
 cc @username
```

_Everyone_ is encouraged to review PRs and add feedback and ask questions, even
people who are new. Also, don’t just review PRs about what you’re working on.
Reading other people’s code is a great way to learn new techniques, and seeing
code outside of your own feature helps you to see patterns across the project.
It’s also helpful to see the feedback other contributors are getting on their
PRs.

### Lifecycle of a Pull Request

When you’re first starting out, your natural instinct when creating a new
feature will be to create a local feature branch, and start building away. If
you start doing this, _stop_, take your hands off the keyboard, grab a coffee
and read on. :)

**It’s important to break your feature down into small pieces first**, each
piece should become its own pull request. Even if after finishing the first
piece your feature isn’t functional, that is okay, we love merging unfinished
code early and often.

Once you know what the first small piece of your feature will be, follow this
general process while working:

1. [Fork](https://help.github.com/articles/fork-a-repo/) the project and create
   a new branch, using [the branch naming
   scheme](https://github.com/Lumieducation/H5P-Nodejs-library/tree/027b83add22a5f17a898c45f8fc3e55b83eb877d/docs/git-workflow.md#branch-naming-scheme),
   _e.g._ `add/video-preview` or `fix/1337-language-too-geeky`.
2. Make your first commit: any will do even if empty or trivial, but we need
   something in order to create the initial pull request. [Create the pull
   request](https://help.github.com/articles/creating-a-pull-request-from-a-fork/).
   * Write a detailed description of the problem you are solving, the part it
     affects, and how you plan on going about solving it.
   * If you have write access, add the **[Status] In Progress** label or wait
     until somebody adds it. This indicates that the pull request isn’t ready
     for a review and may still be incomplete. On the other hand, it welcomes
     early feedback and encourages collaboration during the development process.
3. Start developing and pushing out commits to your new branch.
   * You can use a branch prefix like `add/`, `update/`, `try/` or `fix/` that
     represents the type of work you're doing.
   * Push your changes out frequently and try to avoid getting stuck in a
     long-running branch or a merge nightmare. Smaller changes are much easier
     to review and to deal with potential conflicts.
   * Run all tests before pushing. This ensures that your code follows the style
     guidelines and doesn’t accidentally introduce any errors or regressions.
   * Don’t be afraid to change,
     [squash](http://gitready.com/advanced/2009/02/10/squashing-commits-with-rebase.html),
     and rearrange commits or to force push - `git push -f origin
     fix/something-broken`. Keep in mind, however, that if other people are
     committing on the same branch then you can mess up their history. You are
     perfectly safe if you are the only one pushing commits to that branch.
   * Squash minor commits such as typo fixes or [fixes to previous
     commits](http://fle.github.io/git-tip-keep-your-branch-clean-with-fixup-and-autosquash.html)
     in the pull request.
4. If you end up needing more than a few commits, consider splitting the pull
   request into separate components. Discuss in the new pull request and in the
   comments why the branch was broken apart and any changes that may have taken
   place that necessitated the split. Our goal is to catch early in the review
   process those pull requests that attempt to do too much.
5. When you feel that you are ready for a formal review or for merging into
   `master` make sure you check this list:
   * Make sure your branch merges cleanly and consider rebasing against `master`
     to keep the branch history short and clean.
   * Add unit tests, or at a minimum, provide helpful instructions for the
     reviewer so they can test your changes. This will help speed up the review
     process.
   * Ensure that your commit messages are
     [meaningful](http://robots.thoughtbot.com/5-useful-tips-for-a-better-commit-message).
6. Mention that the PR is ready for review or if you have write access remove
   the **[Status] In Progress** label from the pull request and add the
   **[Status] Needs Review** label - someone will provide feedback on the latest
   unreviewed changes. The reviewer will also mark the pull request as
   **[Status] Needs Author Reply** if they think you need to change anything.
7. If you get a 👍 and the status has been changed to **[Status] Ready to
   Merge** – this is great – the pull request is ready to be merged into
   `master`.

Whether somebody is reviewing your code or you are reviewing somebody else’s
code, [a positive mindset towards code
reviews](https://medium.com/medium-eng/the-code-review-mindset-3280a4af0a89)
helps a ton. We’re building something together that is greater than the sum of
its parts.

If you feel yourself waiting for someone to review a PR, don’t hesitate to
personally ask for someone to review it or to mention them on GitHub. _The PR
author is responsible for pushing the change through._

### Commit-Messages

Please make sure to use [conventional commit
messages](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

The commit contains the following structural elements, to communicate intent to
the consumers of your library:

1. **fix**: a commit of the _type_ `fix` patches a bug in your codebase (this
   correlates with `PATCH` in semantic versioning).
2. **feat**: a commit of the _type_ `feat` introduces a new feature to the
   codebase (this correlates with `MINOR` in semantic versioning).
3. **BREAKING CHANGE**: a commit that has a footer `BREAKING CHANGE`:, or
   appends a `!` after the type/scope, introduces a breaking API change
   (correlating with `MAJOR` in semantic versioning). A `BREAKING CHANGE` can be
   part of commits of any type.
4. types other than `fix`: and `feat`: are allowed, for example: `chore`, `ci`,
   `docs`, `style`, `refactor`, `perf`, `test`, and others.
5. footers other than `BREAKING CHANGE: <description>` may be provided and
   follow a convention similar to git trailer format.

### Short Branches: Merge Early and Often

In order to avoid lots of conflicts, to make sure the code works together, and
to make the code review process easier, we strongly encourage that branches are
small and short-lived. A branch that only has one small commit is perfectly fine
and normal.

### Keeping Your Branch Up To Date

While it is tempting to merge from `master` into your branch frequently, this
leads to a messy history because each merge creates a merge commit. When working
by yourself, it is best to use `git pull --rebase master`, but if you're pushing
to a shared repo, it is best to not do any merging or rebasing until the feature
is ready for final testing, and then do a
[rebase](https://github.com/edx/edx-platform/wiki/How-to-Rebase-a-Pull-Request)
at the very end. This is one reason why it is important to open pull requests
whenever you have working code.

If you have a Pull Request branch that cannot be merged into `master` due to a
conflict (this can happen for long-running Pull Request discussions), it's still
best to rebase the branch (rather than merge) and resolve any conflicts on your
local copy.

Once you have resolved any conflicts locally you can update the Pull Request
with `git push --force-with-lease` (note: we prefer using `--force-with-lease`
over `--force` to help protect remote commits).

**Be aware** that a force-push will still **replace** (overwrite) any commits
currently in your shared branch, so anyone who is also using that branch will be
in trouble. Only use `git push --force-with-lease` if the Pull Request is ready
to merge and no one else is using it (or if you have coordinated the force-push
with the other developers working on the branch).

### We’re Here To Help

We encourage you to ask for help at any point. You can open issues or chat with
us in
[Slack](https://join.slack.com/t/lumi-education/shared_invite/zt-3dcc4gpy-8XxjefFeUHEv89hCMkwmbw)
or reach us via [c@Lumi.education](mailto:c@Lumi.education).

This CONTRIBUTING.md was adapted from [Automattics WordPress Calypso
CONTRIBUTING.md](https://github.com/Automattic/wp-calypso/blob/master/.github/CONTRIBUTING.md)

