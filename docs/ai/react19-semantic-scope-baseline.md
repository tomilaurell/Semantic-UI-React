# React 19 Semantic Scope Baseline

Baseline captured on 2026-06-26 in worktree:

`/Users/tomi/.config/superpowers/worktrees/Semantic-UI-React/react19-semantic-scope`

Branch: `codex/react19-semantic-scope`

## Environment

- Default shell `node`: `v8.16.0`
- Default `yarn`: `1.22.0`
- Project install fails under Node 8 because `@percy/cli@1.0.0-beta.73` requires Node `>=12`.
- Baseline commands were run with `PATH=/Users/tomi/.nvm/versions/node/v16.20.0/bin:$PATH`.
- Node 16 command environment: `v16.20.0`
- Yarn under Node 16 command environment: `1.22.0`

## Baseline Commands

- `yarn install --frozen-lockfile`
  - Node 8: fails on `@percy/cli` engine requirement.
  - Node 16: exits 0.
  - Baseline warnings: several historical incorrect peer dependency warnings.
- `yarn lint`
  - Exits 0.
  - Reports 36 baseline warnings, mostly existing accessibility warnings plus React hooks warnings.
- `yarn tsd:test`
  - Exits 0.
  - Reports baseline Browserslist, Babel lodash plugin, React Router displayName, and Node deprecation warnings.
- `yarn test`
  - Exits 0.
  - Reports `11031 tests completed` and `8 tests slow`.
  - Reports the same baseline warning classes as build/docgen.
- `yarn build:dist`
  - Exits 0.
  - Builds CommonJS, ES, and UMD outputs.
  - Reports the same baseline warning classes as build/docgen.
- `yarn test:umd`
  - Exits 0.
  - Builds UMD and runs `test/umd.js`.

## React 19 Audit

Source/runtime follow-ups:

- `src/addons/Portal/usePortalElement.js`
  - Reads `node.ref`.
- `src/addons/Portal/utils/useTrigger.js`
  - Reads `trigger?.ref`.
- `src/elements/Input/Input.js`
  - Reads `child.ref`.
- `src/modules/Transition/Transition.js`
  - Has `Transition.defaultProps`; classify before changing because React 19 keeps class component `defaultProps` support but removes function component `defaultProps` support.

Test-only follow-ups:

- `test/specs/addons/Portal/Portal-test.js`
  - Imports `act` from `react-dom/test-utils`.
- `test/specs/addons/Portal/PortalInner-test.js`
  - Imports `act` from `react-dom/test-utils`.
- `test/specs/lib/hooks/useClassNamesOnNode-test.js`
  - Imports `act` from `react-dom/test-utils`.

Docs/runtime/example follow-ups:

- `docs/src/index.js`
  - Uses `ReactDOM.render` and `ReactDOM.hydrate`.
- `docs/src/pages/Usage.mdx`
  - Shows `ReactDOM.render` in the no-bundler example.
- `docs/src/components/ComponentDoc/ComponentControls/ComponentControlsCodeSandbox.js`
  - Generates a CodeSandbox snippet that uses `ReactDOM.render`.
- `test/umd.js`
  - Uses React 16 UMD CDN scripts and `ReactDOM.render`.

Safe or unrelated hits:

- `src/lib/factories.js` and many component shorthand calls use local `defaultProps` terminology for shorthand prop merging; this is not React component `defaultProps`.
- `src/lib/ModernAutoControlledComponent.js` inspects class component `defaultProps`; this is not an immediate React 19 runtime removal issue by itself.

## CSS Scope Audit

Installed Semantic UI CSS files are present under `node_modules/semantic-ui-css/`, including:

- `semantic.css`
- `semantic.min.css`
- per-component `components/*.css`
- font/image assets under the package asset tree

Selector and at-rule counts from `node_modules/semantic-ui-css/semantic.css`:

- Selectors touching `html`: 5
- Selectors touching `body`: 24
- Selectors touching `.ui`: 6130
- Bare `input...` selectors: 8
- Bare `button...` selectors counted by the simple line-start script: 0
- `@font-face` blocks: 8
- keyframe blocks: 112
- `animation-name` declarations: 112
- `animation` shorthand declarations: 32

Important leakage examples:

- `semantic.css` imports Google Lato globally.
- `semantic.css` includes reset/site rules for `html`, `body`, `button`, `input`, selections, scrollbars, and site font-family.
- `docs/public/style.css` also has docs-only global `html, body` styling and must not be conflated with the library scoped CSS artifact.

Runtime scope-sensitive source surfaces:

- `src/addons/Portal/PortalInner.js`
  - Defaults portal mount to `document.body`.
- `src/modules/Modal/Modal.js`
  - Defaults modal mount to `document.body`.
- `src/modules/Modal/ModalDimmer.js`
  - Adds body-like classes to the mount node.
- `src/modules/Dimmer/Dimmer.js`
  - Adds and removes `dimmed`/`dimmable` directly on `document.body` for page dimmers.
- `src/modules/Search/Search.js`
  - Uses global `.ui.search.active.visible .results.visible` query.
- `src/modules/Dropdown/Dropdown.js`
  - Mostly queries under `this.ref.current`; preserve that local pattern.
- `src/modules/Sidebar/Sidebar.js`
  - Defaults event target to `documentRef` and relies on Semantic CSS pushable/pusher behavior.
