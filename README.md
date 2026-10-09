# Griffin Edwards

Source for [griffin-has-questions.github.io](https://griffin-has-questions.github.io/), built with the Academic Pages Jekyll theme.

## Editing content

The main editable files are:

- `_pages/about.md` for the homepage
- `_pages/teaching.md`
- `_pages/research.md`
- `_pages/service.md`
- `_pages/visualizations.md`
- `_pages/puzzles.md`
- `_pages/cv.md`
- `_data/navigation.yml` for the top navigation
- `_config.yml` for the sidebar and site metadata

The existing theme and its `dirt` color scheme are intentionally unchanged.

## Previewing locally

After installing Ruby and Bundler:

```bash
bundle install
bundle exec jekyll serve -l -H localhost
```

Then open `http://localhost:4000`.

## Publishing

Commit the changes and push them to the repository's `master` branch. GitHub Pages will rebuild the public site automatically.

The underlying template is [Academic Pages](https://github.com/academicpages/academicpages.github.io).
