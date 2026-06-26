# React 19 Semantic Scope Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make this Semantic UI React checkout minimally React 19 compatible and add a scoped Semantic UI CSS path that prevents Semantic styles from leaking into unrelated UI, such as ChatCNN components rendered in the same app.

**Architecture:** Keep the React component API and existing Semantic UI class contract intact. Add React 19 compatibility at package/runtime/test seams, then introduce a generated scoped CSS artifact plus a small runtime scope helper for portals, page dimmers, and global DOM queries that cannot be fixed by selector rewriting alone.

**Tech Stack:** React 16.8-19 peer range, React DOM client APIs, Babel/Gulp/Webpack 4 build pipeline, PostCSS selector rewriting, Karma/Enzyme legacy tests, a small React 19 smoke fixture, and browser computed-style checks.

---

## Executive Summary

This should be treated as two related but separately verifiable changes.

First, React 19 support is mostly a compatibility and packaging task. The library already moved away from `findDOMNode` in v3, but the repo still exposes React 17 dev/runtime assumptions: `peerDependencies` exclude React 19, docs and UMD smoke tests still use `ReactDOM.render`, tests import `act` from `react-dom/test-utils`, and a few source files read `element.ref`, which React 19 warns against. The plan is to keep the existing Enzyme suite as legacy regression coverage and add a targeted React 19 smoke fixture instead of rewriting the whole test suite up front.

Second, CSS isolation is not just selector prefixing. The library itself does not ship CSS from `src`; consumers currently import `semantic-ui-css/semantic.min.css` globally or docs load Semantic UI CDN CSS. A scoped solution should generate a new CSS artifact from `semantic-ui-css`, expose a documented wrapper contract such as `.semantic-scope`, and update runtime components that mount to `document.body`, add body-like classes, or query global `.ui...` selectors. Without that runtime work, Modal, Popup, Dimmer, Portal, Search, Dropdown, and Sidebar will either miss scoped styles or keep leaking behavior outside the scope.

Primary React reference: https://react.dev/blog/2024/04/25/react-19-upgrade-guide

## Findings

- `package.json` is `semantic-ui-react` version `3.0.0-beta.2`; package `files` includes only `src`, `dist`, and `index.d.ts`.
- `package.json` `peerDependencies` allow only `react` and `react-dom` `^16.8.0 || ^17.0.0 || ^18.0.0`.
- `package.json` dev and resolution pins are React 17 oriented: `react`, `react-dom`, `react-test-renderer`, and `react-is` are pinned or resolved around `17`, while `@types/react` is `18.0.5`.
- `test/setup.js` configures Enzyme with `@wojtekmaj/enzyme-adapter-react-17`.
- `docs/src/index.js`, `docs/src/pages/Usage.mdx`, `docs/src/components/ComponentDoc/ComponentControls/ComponentControlsCodeSandbox.js`, and `test/umd.js` still use `ReactDOM.render` or `ReactDOM.hydrate` patterns.
- `test/specs/addons/Portal/Portal-test.js`, `test/specs/addons/Portal/PortalInner-test.js`, and `test/specs/lib/hooks/useClassNamesOnNode-test.js` import `act` from `react-dom/test-utils`.
- `src/addons/Portal/usePortalElement.js`, `src/addons/Portal/utils/useTrigger.js`, and `src/elements/Input/Input.js` read `node.ref`, `trigger?.ref`, or `child.ref`; React 19 treats element refs as regular props and warns on `element.ref`.
- `src/modules/Transition/Transition.js` has a component-level `defaultProps`; React 19 removes `defaultProps` support for function components but class components still keep support. This file must be classified before changing anything.
- Docs-only function components with `defaultProps` exist under `docs/src/components/*`; they should be handled only if docs are part of the React 19 acceptance path.
- The library has no CSS sources under `src`. CSS enters through `semantic-ui-css`, Semantic UI CDN links, docs examples, and `docs/public/style.css`.
- `docs/src/components/Document.js` links global Semantic UI CDN CSS and docs local `style.css`.
- `docs/src/pages/Usage.mdx` tells consumers to import `semantic-ui-css/semantic.min.css` globally.
- `gulp/tasks/dist.mjs` builds only JS and `.d.ts` artifacts into `dist/commonjs`, `dist/es`, and `dist/umd`; there is no CSS build or copy task today.
- `static.config.js` hard-codes docs Semantic UI version `2.4.2` because of historical `semantic-ui-css` package issues.
- `src/addons/Portal/PortalInner.js` defaults `mountNode` to `document.body`.
- `src/modules/Modal/Modal.js` defaults `mountNode` to `document.body`.
- `src/modules/Modal/ModalDimmer.js` applies `dimmable dimmed`, `blurring`, and `scrolling` classes to the mount node.
- `src/modules/Dimmer/Dimmer.js` adds and removes `dimmed` and `dimmable` directly on `document.body` for page dimmers.
- `src/modules/Search/Search.js` uses a global query for `.ui.search.active.visible .results.visible`.
- `src/modules/Dropdown/Dropdown.js` mostly scopes menu queries through `this.ref.current`, which is a better pattern to preserve.
- `src/modules/Sidebar/Sidebar.js` defaults event target to `documentRef` and has pushable/pusher behavior that is CSS-dependent.
- Tests currently assert document/body rendering for Modal, Popup, Portal, Confirm, Dimmer, Dropdown, Search, and Sidebar. Those tests identify the behavior surface that must be preserved or intentionally adjusted.

## Recommended Approach

Use a compatibility-first, additive-scope approach:

1. Make React 19 runtime support minimally visible through package metadata, source warning fixes, docs/UMD render API updates, and a React 19 smoke fixture.
2. Keep the unscoped CSS path available for backwards compatibility. Add a new generated scoped CSS artifact and document the new wrapper contract.
3. Add a tiny runtime scope utility rather than changing component class names. Components should still render `.ui button`, `.ui modal`, etc.; scoped CSS should make those classes effective only under `.semantic-scope`.
4. Let portals inherit or accept a scope mount node so portaled DOM stays inside `.semantic-scope` when scoped CSS is used.
5. Treat legacy page-level body behavior as an explicit compatibility decision. In scoped mode, body classes must be simulated on the scope container or mount node; in legacy mode they can remain on `document.body`.

## Rejected Alternatives

- Do not prefix every React-rendered class name. That would diverge from Semantic UI CSS, break user class selectors, and make component APIs incompatible with the existing ecosystem.
- Do not replace the entire Enzyme suite before adding React 19 support. It is too large and unrelated to the minimal runtime goal. Use it as legacy coverage and add a focused React 19 browser smoke path.
- Do not regex-rewrite `semantic.min.css`. CSS selector transformation must use a parser so media blocks, grouped selectors, pseudo selectors, keyframes, and at-rules are handled predictably.
- Do not require consumers to globally load scoped and unscoped CSS together. The docs should warn that using both can reintroduce leakage and duplication.
- Do not claim full CSS isolation until Modal, Dimmer, Popup, Portal, Search, Dropdown, and Sidebar are tested in scoped mode.

## File Structure Plan

Potential new files:

- `docs/ai/react19-semantic-scope-plan.md`
  - This planning artifact.
- `scripts/build-scoped-semantic-css.js`
  - Reads the installed Semantic UI CSS artifact and writes scoped CSS plus copied font/assets.
- `scripts/verify-scoped-css.js`
  - Optional static guard that parses generated CSS and fails on forbidden unscoped selectors.
- `src/lib/semanticScope.js`
  - Runtime helpers for finding a `.semantic-scope` ancestor, resolving a portal mount node, and querying within a scope.
- `test/react-19-smoke/package.json`
  - Isolated React 19 consumer fixture.
- `test/react-19-smoke/src/App.js`
  - Renders representative Semantic UI React components under `.semantic-scope`.
- `test/react-19-smoke/src/main.js`
  - Uses `createRoot` from `react-dom/client`.
- `test/react-19-smoke/src/scopeSmoke.js`
  - Browser checks for React 19 warnings, portaled components, and scoped CSS leakage.
- `test/css-scope/scope-fixture.html` or equivalent JS-driven fixture
  - Minimal static leak fixture if a full React smoke fixture is too slow for CI.

Potential modified files:

- `package.json`
  - Peer ranges, dev/test scripts, CSS artifact `files`, parser dev dependencies, React 19 smoke scripts.
- `yarn.lock`
  - Dependency lock updates.
- `gulp/tasks/dist.mjs`
  - Add a CSS generation/copy task to `build:dist`.
- `config.js`
  - Add dist CSS path helpers only if needed.
- `src/addons/Portal/PortalInner.js`
  - Resolve scoped default mount node.
- `src/addons/Portal/Portal.js`
  - Forward scope-related mount behavior without breaking explicit `mountNode`.
- `src/addons/Portal/usePortalElement.js`
  - Stop reading `node.ref` directly.
- `src/addons/Portal/utils/useTrigger.js`
  - Stop reading `trigger.ref` directly.
- `src/elements/Input/Input.js`
  - Stop reading `child.ref` directly.
- `src/modules/Modal/Modal.js`
  - Use scoped mount resolution while preserving explicit `mountNode`.
- `src/modules/Modal/ModalDimmer.js`
  - Treat the mount/scope node as the body-like class target in scoped mode.
- `src/modules/Dimmer/Dimmer.js`
  - Avoid unconditional `document.body.classList` for scoped page dimmers.
- `src/modules/Search/Search.js`
  - Replace global `.ui.search...` lookup with a scope/root-aware query.
- `src/modules/Popup/Popup.js`
  - Verify and pass scoped portal mount behavior.
- `src/modules/Sidebar/Sidebar.js`
  - Verify target handling against scoped pushable containers.
- `src/lib/hooks/useClassNamesOnNode.js`
  - Add null guards if scoped mount resolution can be temporarily unavailable.
- `docs/src/index.js`
  - Use `createRoot` or `hydrateRoot`.
- `docs/src/components/Document.js`
  - Stop linking unscoped Semantic CSS for scoped docs mode, or make the docs choice explicit.
- `docs/src/pages/Usage.mdx`
  - Document scoped CSS import and wrapper usage.
- `docs/src/pages/Theming.mdx`
  - Warn that custom themes need the same scoping transform.
- `docs/src/components/ComponentDoc/ComponentControls/ComponentControlsCodeSandbox.js`
  - Use React 19-compatible root code and scoped CSS option.
- `test/umd.js`
  - Replace React 16 UMD assumptions with a modern smoke path or split legacy/modern UMD checks.
- `test/setup.js`
  - Keep Enzyme adapter for legacy suite unless a targeted test requires otherwise.
- `test/specs/addons/Portal/Portal-test.js`
  - Import `act` from `react`.
- `test/specs/addons/Portal/PortalInner-test.js`
  - Import `act` from `react`.
- `test/specs/lib/hooks/useClassNamesOnNode-test.js`
  - Import `act` from `react`.
- `test/specs/modules/Search/Search-test.js`
  - Add scoped query regression.
- `test/specs/modules/Dimmer/Dimmer-test.js`
  - Add scoped page dimmer regression.
- `test/specs/modules/Modal/Modal-test.js`
  - Add scoped mount-node regression.

## Phase 0: Baseline Audit And Proof Setup

### Task 0.1: Capture current baseline commands

**Files:**
- Read: `package.json`
- Read: `gulp/tasks/dist.mjs`
- Read: `karma.conf.babel.js`
- Read: `webpack.karma.config.js`
- Create or update: `docs/ai/react19-semantic-scope-baseline.md` if evidence notes are desired

- [ ] Run `git status --short`.
- [ ] Run `yarn --version` and `node --version`.
- [ ] Run `yarn install --frozen-lockfile` if dependencies are not installed.
- [ ] Run `yarn lint`.
- [ ] Run `yarn tsd:test`.
- [ ] Run `yarn test`.
- [ ] Run `yarn build:dist`.
- [ ] Run `yarn test:umd`.
- [ ] Record failures separately from implementation regressions. Do not fix unrelated baseline failures in this phase.
- [ ] Commit only if a baseline evidence document is added.

### Task 0.2: Build a React 19 compatibility audit table

**Files:**
- Read: `src/**/*.{js,d.ts}`
- Read: `docs/src/**/*.js`
- Read: `docs/src/**/*.mdx`
- Read: `test/**/*.js`
- Create or update: `docs/ai/react19-semantic-scope-baseline.md` if evidence notes are desired

- [ ] Check official React 19 guide for removed/deprecated APIs.
- [ ] Search for `ReactDOM.render`, `ReactDOM.hydrate`, `unmountComponentAtNode`, `findDOMNode`, `react-dom/test-utils`, `element.ref`, `.ref`, `defaultProps`, legacy context, string refs, `React.createFactory`, and `React.PropTypes`.
- [ ] Classify each hit as `source runtime`, `docs runtime`, `docs example`, `test-only`, or `safe helper terminology`.
- [ ] Mark `src/addons/Portal/usePortalElement.js`, `src/addons/Portal/utils/useTrigger.js`, and `src/elements/Input/Input.js` as source runtime `element.ref` follow-ups.
- [ ] Mark docs and UMD render code as docs/smoke follow-ups.
- [ ] Mark Enzyme adapter as legacy-test follow-up, not a source-runtime blocker.

### Task 0.3: Build a CSS leakage inventory

**Files:**
- Read: `docs/src/components/Document.js`
- Read: `docs/src/pages/Usage.mdx`
- Read: `docs/src/pages/Theming.mdx`
- Read: `docs/public/style.css`
- Read after install: `node_modules/semantic-ui-css/semantic.css`
- Read after install: `node_modules/semantic-ui-css/semantic.min.css`

- [ ] Confirm which Semantic CSS file is present after install.
- [ ] Parse the source CSS and count selectors touching `html`, `body`, `.ui`, bare elements, `@font-face`, `@keyframes`, and animation names.
- [ ] Identify asset URL patterns for icon fonts and images.
- [ ] List global docs-only selectors in `docs/public/style.css`; do not mix docs-site CSS with the library scoped artifact unless docs use it intentionally.
- [ ] Record the isolation contract: scoped library CSS is for Semantic UI styles, not for all docs-site CSS.

## Phase 1: React 19 Minimal Compatibility

### Task 1.1: Update package ranges without dropping older supported React versions

**Files:**
- Modify: `package.json`
- Modify: `yarn.lock`

- [ ] Update `peerDependencies.react` and `peerDependencies.react-dom` to include `^19.0.0`, preserving `^16.8.0 || ^17.0.0 || ^18.0.0` unless a test proves an older range is no longer valid.
- [ ] Update `dependencies.react-is` to include React 19 if the package supports it, for example `^16.8.6 || ^17.0.0 || ^18.0.0 || ^19.0.0`.
- [ ] Update `devDependencies.@types/react` and, if present or needed, `@types/react-dom` to a React 19-compatible version.
- [ ] Add React 19-specific smoke dependencies only inside the smoke fixture if possible, so the legacy test suite can keep its existing dependency assumptions.
- [ ] Run `yarn install`.
- [ ] Run `yarn satisfied` and document whether the script needs an updated ignore list.
- [ ] Commit with `chore: allow react 19 peer range`.

### Task 1.2: Replace deprecated React DOM root APIs in docs/runtime examples

**Files:**
- Modify: `docs/src/index.js`
- Modify: `docs/src/pages/Usage.mdx`
- Modify: `docs/src/components/ComponentDoc/ComponentControls/ComponentControlsCodeSandbox.js`
- Modify: `test/umd.js`

- [ ] In docs runtime, import from `react-dom/client`.
- [ ] Replace `ReactDOM.render` with `createRoot(container).render(...)`.
- [ ] Replace production hydration path with `hydrateRoot(container, <App />)` if docs still hydrate server markup.
- [ ] For hot reload, keep root reuse in module scope so repeated updates do not create multiple roots.
- [ ] Update the Usage and CodeSandbox snippets to show `createRoot`.
- [ ] For `test/umd.js`, decide whether to keep a legacy React 16 UMD check and add a separate modern ESM/React 19 check, or update it fully. React 19 no longer ships UMD builds, so a React 19 script-tag example must use an ESM CDN or the test should remain explicitly legacy.
- [ ] Run the docs build or a narrower docs smoke command.
- [ ] Commit with `chore: use modern react root APIs in docs`.

### Task 1.3: Replace deprecated `act` imports

**Files:**
- Modify: `test/specs/addons/Portal/Portal-test.js`
- Modify: `test/specs/addons/Portal/PortalInner-test.js`
- Modify: `test/specs/lib/hooks/useClassNamesOnNode-test.js`

- [ ] Change `import { act } from 'react-dom/test-utils'` to `import { act } from 'react'`.
- [ ] Run the three affected test files through the Karma test command if a focused pattern is available.
- [ ] If the suite cannot run focused tests, run `yarn test` and record baseline constraints.
- [ ] Commit with `test: import act from react`.

### Task 1.4: Stop reading `element.ref`

**Files:**
- Modify: `src/addons/Portal/usePortalElement.js`
- Modify: `src/addons/Portal/utils/useTrigger.js`
- Modify: `src/elements/Input/Input.js`
- Test: `test/specs/addons/Portal/PortalInner-test.js`
- Test: `test/specs/addons/Portal/Portal-test.js`
- Test: `test/specs/elements/Input/Input-test.js`

- [ ] Write failing tests that render a child/trigger/input with a ref under the React 19 smoke fixture and assert no `element.ref` warning is emitted.
- [ ] In source, use `element.props.ref` where React 19 expects it, while preserving compatibility with React 18 and older if the object shape differs.
- [ ] Preserve existing merged-ref behavior.
- [ ] Run Portal and Input tests.
- [ ] Run the React 19 smoke fixture.
- [ ] Commit with `fix: avoid element ref access`.

### Task 1.5: Audit component `defaultProps`

**Files:**
- Read: `src/modules/Transition/Transition.js`
- Read: `docs/src/components/CopyToClipboard.js`
- Read: `docs/src/components/NoSSR.js`
- Read: `docs/src/components/CodeEditor/CodeEditor.js`
- Read: `docs/src/components/ComponentDoc/**/*.js`

- [ ] Confirm whether `src/modules/Transition/Transition.js` is a function component, class component, or wrapped component that still receives defaults correctly under React 19.
- [ ] If it is a function component, convert its `defaultProps` to parameter defaults or internal defaulting.
- [ ] Treat docs-only `defaultProps` separately and change only if docs are part of the React 19 smoke/build acceptance path.
- [ ] Preserve shorthand factory `defaultProps` terminology in `src/lib/factories.js`; that is not React component `defaultProps`.
- [ ] Commit only if a runtime-relevant defaultProps change is required.

### Task 1.6: Add a React 19 smoke fixture

**Files:**
- Create: `test/react-19-smoke/package.json`
- Create: `test/react-19-smoke/src/main.js`
- Create: `test/react-19-smoke/src/App.js`
- Create: `test/react-19-smoke/src/scopeSmoke.js`
- Modify: `package.json`

- [ ] Create a minimal Vite or Webpack fixture that depends on local `semantic-ui-react` via `file:../..` or an equivalent workspace-safe path.
- [ ] Pin fixture `react` and `react-dom` to React 19.
- [ ] Render Button, Icon, Form/Input/Checkbox, Dropdown, Search, Modal, Popup, Dimmer, Sidebar, Transition, and Portal.
- [ ] Capture `console.error` and `console.warn`; fail on React compatibility warnings except explicitly whitelisted baseline third-party warnings.
- [ ] Add root script such as `test:react19-smoke` that installs/builds/runs the fixture in a deterministic way.
- [ ] Commit with `test: add react 19 smoke fixture`.

## Phase 2: Scoped CSS Generation And Build Artifact

### Task 2.1: Add parser dependencies and CSS artifact contract

**Files:**
- Modify: `package.json`
- Modify: `yarn.lock`
- Modify: `README.md`
- Modify: `docs/src/pages/Usage.mdx`

- [ ] Add dev dependencies for CSS parsing, likely `postcss`, `postcss-selector-parser`, and a minifier if needed.
- [ ] Decide artifact names:
  - `dist/css/semantic-ui-scoped.css`
  - `dist/css/semantic-ui-scoped.min.css`
  - copied font assets under `dist/css/themes/default/assets/fonts/` or a documented parallel path.
- [ ] Add `dist/css` to package `files` if needed.
- [ ] Document that scoped CSS is opt-in and consumers must wrap Semantic UI output in `.semantic-scope`.
- [ ] Commit with `build: prepare scoped css artifact`.

### Task 2.2: Implement the scoped CSS generator

**Files:**
- Create: `scripts/build-scoped-semantic-css.js`
- Create: `scripts/verify-scoped-css.js`
- Modify: `gulp/tasks/dist.mjs`
- Modify: `package.json`

- [ ] Read from `node_modules/semantic-ui-css/semantic.css` if available; fall back to `semantic.min.css` only if formatting is irrelevant to parser output.
- [ ] Transform selectors through PostCSS and selector-parser.
- [ ] Prefix Semantic selectors under `.semantic-scope`.
- [ ] Rewrite `html` and `body` selectors into scope-container equivalents. Examples:
  - `html, body` should become `.semantic-scope` or `.semantic-scope.semantic-root` depending on the chosen contract.
  - `body.dimmable` should become `.semantic-scope.dimmable`.
  - `body.pushable` should become `.semantic-scope.pushable`.
  - `body > .ui.dimmer` should become `.semantic-scope > .ui.dimmer` or a documented portaled mount pattern.
- [ ] Preserve selectors that are already scoped.
- [ ] Preserve `@font-face`, but verify font-family names do not globally override non-Semantic elements. Font-face definitions are global by CSS design; leakage prevention should be based on scoped `font-family` application, not renamed fonts unless necessary.
- [ ] Preserve or rewrite `@keyframes` only if animation names collide with common app names. If rewriting, rewrite all `animation` and `animation-name` declarations consistently.
- [ ] Preserve asset URLs or copy assets so built CSS resolves correctly from package consumers.
- [ ] Generate minified and non-minified artifacts.
- [ ] Add a verify script that fails if generated CSS contains forbidden unscoped selectors like bare `body`, bare `html`, bare `.ui`, bare `input`, bare `button`, or unqualified Semantic reset selectors.
- [ ] Add `build:dist:css` and include it in `build:dist`.
- [ ] Commit with `build: generate scoped semantic css`.

### Task 2.3: Add CSS leak tests

**Files:**
- Create: `test/css-scope/scope-fixture.html` or include in `test/react-19-smoke`
- Create: `test/css-scope/run-scope-check.js` or include in `test/react-19-smoke/src/scopeSmoke.js`
- Modify: `package.json`

- [ ] Create an outside sentinel such as `.chatcnn-sentinel` with known computed style values.
- [ ] Create a `.semantic-scope` area containing Semantic components and bare HTML elements that Semantic normally styles.
- [ ] Load only scoped CSS.
- [ ] Assert the sentinel's font family, font size, line height, color, background, margin, padding, border, box sizing, and display are unchanged.
- [ ] Assert inside Semantic components still receive expected key styles.
- [ ] Add root script such as `test:css-scope`.
- [ ] Commit with `test: add scoped css leak checks`.

## Phase 3: Runtime Scope Integration For Portal, Body, And Global Query Components

### Task 3.1: Add semantic scope helper

**Files:**
- Create: `src/lib/semanticScope.js`
- Modify: `src/lib/index.js`
- Test: `test/specs/lib/semanticScope-test.js`

- [ ] Implement `getSemanticScope(node, scopeClassName = 'semantic-scope')`.
- [ ] Implement `resolveSemanticMountNode(explicitMountNode, fallbackNode)`:
  - If `explicitMountNode` is passed, return it unchanged.
  - Else, find the closest `.semantic-scope` from the trigger/content/fallback node.
  - Else, return `document.body` for legacy behavior.
- [ ] Implement `querySemanticScope(node, selector)` or equivalent helper that queries within the closest scope before falling back to `document`.
- [ ] Keep helper side-effect-free and SSR-safe.
- [ ] Write tests for explicit mount, scoped fallback, body fallback, null/SSR behavior, and nested scopes.
- [ ] Commit with `feat: add semantic scope helpers`.

### Task 3.2: Scope Portal and Popup mounting

**Files:**
- Modify: `src/addons/Portal/Portal.js`
- Modify: `src/addons/Portal/PortalInner.js`
- Modify: `src/modules/Popup/Popup.js`
- Test: `test/specs/addons/Portal/Portal-test.js`
- Test: `test/specs/addons/Portal/PortalInner-test.js`
- Test: `test/specs/modules/Popup/Popup-test.js`

- [ ] Preserve explicit `mountNode` behavior.
- [ ] When no `mountNode` is provided and a trigger/content ancestor is inside `.semantic-scope`, mount the portal inside that scope.
- [ ] Preserve document-level event behavior for close-on-document-click and escape.
- [ ] Add tests where a Popup trigger is inside `.semantic-scope` and popup DOM appears within that scope.
- [ ] Add tests where no scope exists and portal still mounts to `document.body`.
- [ ] Commit with `feat: mount portals within semantic scope`.

### Task 3.3: Scope Modal and Dimmer body-like classes

**Files:**
- Modify: `src/modules/Modal/Modal.js`
- Modify: `src/modules/Modal/ModalDimmer.js`
- Modify: `src/modules/Dimmer/Dimmer.js`
- Test: `test/specs/modules/Modal/Modal-test.js`
- Test: `test/specs/modules/Dimmer/Dimmer-test.js`

- [ ] Preserve explicit `mountNode`.
- [ ] In scoped mode, add `dimmable`, `dimmed`, `blurring`, and `scrolling` to the scope/mount node instead of `document.body`.
- [ ] In legacy mode, preserve current `document.body` behavior.
- [ ] Verify `page` dimmers still cover the intended scope area under scoped CSS.
- [ ] Decide whether scoped page dimmer means "cover only scope" or "cover viewport while styles remain scoped". Document the decision.
- [ ] Add nested-scope tests to avoid class leakage into sibling scopes.
- [ ] Commit with `feat: scope modal and dimmer classes`.

### Task 3.4: Scope Search, Dropdown, and Sidebar DOM behavior

**Files:**
- Modify: `src/modules/Search/Search.js`
- Inspect and maybe modify: `src/modules/Dropdown/Dropdown.js`
- Inspect and maybe modify: `src/modules/Sidebar/Sidebar.js`
- Test: `test/specs/modules/Search/Search-test.js`
- Test: `test/specs/modules/Dropdown/Dropdown-test.js`
- Test: `test/specs/modules/Sidebar/Sidebar-test.js`

- [ ] Replace Search global query for `.ui.search.active.visible .results.visible` with a query rooted at the current component or closest `.semantic-scope`.
- [ ] Confirm Dropdown menu queries remain rooted at `this.ref.current`; add a scoped regression without changing code if already safe.
- [ ] Confirm Sidebar target defaults do not force scoped components to rely on `document.body` styling. Add a scoped pushable/pusher regression.
- [ ] Keep document-click behavior global unless it causes cross-scope closing bugs; then filter using target containment rather than CSS scope alone.
- [ ] Commit with `fix: keep semantic queries inside scope`.

## Phase 4: Docs And Examples

### Task 4.1: Update public usage docs

**Files:**
- Modify: `docs/src/pages/Usage.mdx`
- Modify: `docs/src/pages/Theming.mdx`
- Modify: `README.md`

- [ ] Add scoped CSS installation/import example:

```js
import 'semantic-ui-react/dist/css/semantic-ui-scoped.min.css'
```

- [ ] Add wrapper example:

```jsx
<div className="semantic-scope">
  <Button primary>Save</Button>
</div>
```

- [ ] Explain that components using Portal/Modal/Popup/Dimmer will mount within the nearest `.semantic-scope` in scoped mode unless `mountNode` is explicitly provided.
- [ ] Explain that custom Semantic UI themes must be passed through the same scoping transform before use in mixed-style apps.
- [ ] Warn not to import global `semantic-ui-css/semantic.min.css` and scoped CSS in the same app unless the global leakage is intentional.
- [ ] Commit with `docs: document scoped semantic css`.

### Task 4.2: Update docs app CSS loading

**Files:**
- Modify: `docs/src/components/Document.js`
- Modify: `docs/public/style.css`
- Modify: `static.config.js` if needed

- [ ] Decide if docs should demonstrate legacy unscoped CSS, scoped CSS, or a toggle. For minimal scope, use scoped CSS in at least one verification page instead of converting the whole docs app.
- [ ] If docs app uses scoped CSS, wrap the docs app Semantic UI area in `.semantic-scope`.
- [ ] Keep docs-site-only CSS separate; `docs/public/style.css` can remain docs-specific but should not be mistaken for library scoped CSS.
- [ ] Update CDN links only if docs runtime is part of React 19 acceptance.
- [ ] Commit with `docs: wire scoped css example`.

## Phase 5: Verification And Acceptance

### Task 5.1: Run legacy regression checks

**Files:**
- No source changes unless failures are diagnosed as caused by current implementation

- [ ] Run `yarn lint`.
- [ ] Run `yarn tsd:test`.
- [ ] Run `yarn test`.
- [ ] Run `yarn build:dist`.
- [ ] Run `yarn test:umd` if retained.
- [ ] Compare failures against Phase 0 baseline.
- [ ] Fix only regressions caused by this work.

### Task 5.2: Run React 19 smoke checks

**Files:**
- Read/modify only if smoke failures are implementation regressions

- [ ] Run `yarn test:react19-smoke`.
- [ ] Confirm no React 19 warnings about `ReactDOM.render`, `react-dom/test-utils`, `element.ref`, function `defaultProps`, or invalid refs.
- [ ] Confirm Modal opens and closes.
- [ ] Confirm Popup positions and closes.
- [ ] Confirm Dropdown opens, selection works, and search input focus works.
- [ ] Confirm Search opens results and keyboard selection still works.
- [ ] Confirm Portal content appears in the intended scoped mount.
- [ ] Confirm Dimmer page behavior matches the documented scoped/legacy contract.

### Task 5.3: Run CSS scope checks

**Files:**
- Read/modify only if scope failures are implementation regressions

- [ ] Run `yarn build:dist:css` or `yarn build:dist`.
- [ ] Run `yarn test:css-scope`.
- [ ] Confirm generated CSS has no forbidden unscoped selectors.
- [ ] Confirm `.chatcnn-sentinel` outside `.semantic-scope` keeps its computed styles.
- [ ] Confirm bare `button`, `input`, `a`, `table`, headings, and icons outside `.semantic-scope` are not styled by Semantic CSS.
- [ ] Confirm Semantic UI components inside `.semantic-scope` still look and behave like Semantic UI.
- [ ] Confirm icon fonts load inside scope without applying Semantic icon styles outside scope.

### Task 5.4: Final documentation and release notes

**Files:**
- Modify: `README.md`
- Modify: `docs/src/pages/Usage.mdx`
- Modify: `docs/src/pages/MigrationGuideV2.mdx` or a new docs page if appropriate

- [ ] Add a short "React 19 compatibility" note.
- [ ] Add a short "Scoped CSS" note with import and wrapper examples.
- [ ] Include caveats for page dimmers, modals, and custom themes.
- [ ] Verify docs snippets use `createRoot`.
- [ ] Commit with `docs: add react 19 and scoped css notes`.

## Acceptance Criteria

- `package.json` allows React 19 for `react` and `react-dom` peer dependencies while preserving older supported ranges unless explicitly dropped with evidence.
- A React 19 consumer fixture can install the local package, render representative components, and pass without React 19 compatibility warnings.
- Source code no longer reads `element.ref` in the identified runtime paths.
- Docs/runtime examples no longer recommend `ReactDOM.render` for modern React usage.
- Tests no longer import `act` from `react-dom/test-utils`.
- Existing legacy regression tests either pass or have documented baseline failures that are not caused by this work.
- The package builds a documented scoped CSS artifact.
- Scoped CSS does not apply Semantic UI styles to elements outside `.semantic-scope`.
- Modal, Popup, Portal, Dimmer, Dropdown, Search, and Sidebar work in scoped mode or have documented, tested limits.
- Consumers have clear docs for choosing global Semantic CSS versus scoped Semantic CSS.

## Open Questions

- Should scoped CSS be the new default documentation path, or an opt-in package artifact while global `semantic-ui-css` remains the default for existing users?
- Should scoped page dimmers cover only the `.semantic-scope` area, or should they still visually cover the viewport while keeping body/html styles isolated?
- Should the scoped CSS artifact live in this package, or should it be a separate package if the project wants to preserve the upstream `semantic-ui-react` package contract exactly?
- Should custom theme scoping be supported by a documented script/API, or only by the built default Semantic UI CSS artifact?
- Should React 16.8 remain in the peer range after React 19 work, or is there appetite for a separate major version that drops older React versions?
- Should docs continue to support UMD/script-tag examples, given React 19 removed UMD builds?

## Implementation Notes For The Next Agent

- Start with Phase 0 and commit after each task group.
- Do not begin CSS scoping before React 19 smoke coverage exists; otherwise compatibility warnings can be hidden by CSS work.
- Do not change component-rendered Semantic class names unless a test proves no CSS-artifact approach can cover the case.
- Preserve explicit `mountNode` behavior in all portal-like components.
- Treat every `document.body` touch as a behavior decision: legacy body mode, scoped mount mode, or documented unsupported edge case.
- Keep docs-site CSS separate from library scoped Semantic UI CSS.
