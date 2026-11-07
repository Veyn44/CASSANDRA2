# Manual browser test

## Test through GitHub Pages (preferred)

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `refactor/project-structure` and folder `/ (root)`, then save.
4. Wait for the Pages deployment to finish in the repository's Actions / Pages area.
5. Open the published Pages URL shown by GitHub. Do not assume deployment is ready until GitHub reports it as successful.
6. Open the browser developer console and keep it visible. Confirm the main menu appears without console errors.

If Pages is already configured for another branch, do not replace that setting without checking first. Keep production Pages / `main` untouched.

## Local fallback

1. Open a terminal in the repository root (the folder containing `index.html`).
2. On Windows, run `py -m http.server 8000`. If `py` is unavailable, try `python -m http.server 8000`.
3. Open `http://localhost:8000` in your browser. Keep the terminal running; stop the server with `Ctrl+C` when finished.
4. Do not open the page through a `file://` URL; the game uses JavaScript modules.

The automated checks validate formatting, JavaScript syntax and relative import paths. They do not execute the game or verify its visual behavior. Complete this checklist in a browser before treating the refactor as runtime-verified.

## Normal game

- [ ] Start a normal New Game.
- [ ] Confirm the Cassandra starting ship and its expected starting layout appear.
- [ ] Open and close the build menu; switch categories and materials.
- [ ] Place a hull plan, a wall plan and a prefab; verify the preview and resulting plans/objects appear at the selected coordinates.
- [ ] Use the eraser to cancel a plan and mark an existing structure/module for demolition.
- [ ] In DEV mode, damage a hull floor, hull wall, aluminium wall and door; confirm integrity decreases and the status message names the correct target.
- [ ] Advance the turn; confirm the turn/day counter, environmental update and pawn operational points behave as before.
- [ ] Toggle the grid and verify it redraws correctly.
- [ ] Pan the camera with WASD and zoom with the mouse wheel.
- [ ] Rotate a selected prefab with Q/E and verify the preview orientation changes.
- [ ] Select the researcher and issue a right-click movement command; confirm the pawn follows a path and stops correctly.
- [ ] Select a pawn or object and use the available interaction.
- [ ] Open and close the sections panel.
- [ ] Advance one or more turns and confirm the HUD/resources update as before.
- [ ] Open pause, resume, use Escape, and return to the main menu.
- [ ] Resize the browser and confirm the canvas redraws without errors.

## DEV mode

- [ ] Start DEV New Game and confirm DEV-only controls are visible.
- [ ] Confirm DEV tools can be opened and closed.
- [ ] Open the AST panel and DEV creator; verify their controls respond.
- [ ] Open the damage simulator and toggle it.
- [ ] Export the ship layout and confirm a `cassandra_ship_layout.json` file downloads with format version 2.
- [ ] Return to the main menu and start a normal game; confirm DEV-only controls are hidden.

## Regression checks

- [ ] Repeat New Game after returning to the menu.
- [ ] Confirm no duplicate event handling occurs after multiple sessions.
- [ ] Confirm WASD camera movement and pawn movement stop after returning to the menu; start another session and verify they work exactly once.
- [ ] Check the console for uncaught errors throughout.
- [ ] Compare the starting ship layout and turn behavior against the pre-refactor baseline.

Record any failure with the exact steps and browser-console error. Do not treat a passing CI run as a substitute for this checklist.
