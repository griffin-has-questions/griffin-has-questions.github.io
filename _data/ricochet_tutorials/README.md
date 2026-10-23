# Tutorial levels

Put your tutorial puzzle JSON files in this folder: `_data/ricochet_tutorials/`.

1. Make a level with **Make a puzzle**, then use **Download puzzle JSON**.
2. Rename it for the order you want: `01-first-slide.json`, `02-using-other-pieces.json`, `03-bumpers.json`, and so on.
3. Set the JSON `date` to its release date in `YYYY-MM-DD` format. The filename does not set release.
4. Add the file here, commit/push, and let GitHub Pages rebuild on or after that date.

Released levels appear in a **Tutorials** group in the game’s puzzle picker, in filename order. Weekly puzzles remain in `_data/ricochet_puzzles/`. Keep this README; it preserves the folder in Git and is not a puzzle definition. No sample levels are published automatically.

Tutorials support the same sizes, surfaces, colors, goals, codes, and verified scoreboards as weekly puzzles. Future tutorial definitions are excluded by the same build-time date filter. A public Git repository still exposes committed source files; keep secret future levels outside it.

To change the shared game rules, edit `assets/ricochet/rules.html`.
