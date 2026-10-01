# GitHub and Pages Setup

Public repository: [aeae1/Rock-Saw-Water-Control](https://github.com/aeae1/Rock-Saw-Water-Control).

Live simulator: [Open simulator](https://aeae1.github.io/Rock-Saw-Water-Control/). Pages publishes `main` → `/docs`.

The `docs/` directory contains a static site with local resources and a `.nojekyll` file. No server application, API key, or build service is needed to run the committed site.

## Reproducing the repository setup

Create an empty repository with the target name. A downloaded ZIP does not contain Git history; first initialize it with `git init -b main`, `git add .`, and `git commit -m "Initial project"`. If using an authenticated GitHub CLI from the project directory:

```sh
gh repo create aeae1/Rock-Saw-Water-Control --public --source=. --remote=origin --push
```

This command is a setup instruction, not an indication that publication has already occurred. A project-wide license remains unselected; do not add a license without deciding its intended scope.

## Pages configuration

In repository **Settings → Pages**, select **Deploy from a branch**, branch **main**, and folder **/docs**. Save the selection and verify the resulting deployment before announcing the site as live.

Published address: `https://aeae1.github.io/Rock-Saw-Water-Control/`.

This follows GitHub's [publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). GitHub Pages serves the committed static files; simulator changes therefore require `npm run build` and a commit of the generated files.

## Updating the project

1. Edit the simulator source or documentation.
2. Run `npm ci` if dependencies are not installed, then `npm run check`.
3. Review and commit source changes together with generated changes under `docs/`.
4. Push to `main` and verify the Pages deployment.

The CI workflow checks behavior and whether committed simulator output matches its source. It does not enable Pages or create the repository.
