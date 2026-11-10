# Frontend Atoms and Theme Variables

This is the frontend design-system reference for agents working in this repository. Read it before creating or modifying a React screen or component.

## Atom location and rules

Atoms are located in `Frontend/src/Components/atoms/`. Each atom keeps its JSX and CSS in separate files and generally exposes a class-name based styling API.

Use an existing atom before using MUI. Use MUI only when no existing atom supports the required behavior. Do not create a duplicate atom for a one-off screen requirement.

### Button

- Source: `Frontend/src/Components/atoms/Button/Button.jsx`
- Styles: `Frontend/src/Components/atoms/Button/Button.css`
- Import:

  ```jsx
  import Button from "../../Components/atoms/Button/Button";
  ```

- Common props:
  - `variant`: usually `primary`, `outlined`, or `contained`
  - `size`: `default`, `compact`, or `wide`
  - `icon`: icon name rendered through the Icon atom
  - `startIcon` and `endIcon`: custom React nodes
  - `iconOnly`, `fullWidth`, `disabled`, `state`, and `type`
- Use `state="running"` for a busy action when the existing state behavior is appropriate. The atom supplies the busy icon and `aria-busy`.
- Prefer an accessible text label. Use `iconOnly` only when an accessible `aria-label` is provided.

  ```jsx
  <Button
    type="submit"
    variant="contained"
    state={isSaving ? "running" : undefined}
    disabled={isSaving}
  >
    Save changes
  </Button>
  ```

### Input

- Source: `Frontend/src/Components/atoms/Input/Input.jsx`
- Styles: `Frontend/src/Components/atoms/Input/Input.css`
- Import:

  ```jsx
  import Input from "../../Components/atoms/Input/Input";
  ```

- Supports text inputs, password inputs, textareas (`type="textarea"`), and selects (`select`).
- Relevant props include `label`, `id`, `required`, `disabled`, `icon`, `endIcon`, `validationState`, `validationMessage`, `aria-describedby`, and native input props such as `value`, `onChange`, `name`, and `placeholder`.
- Use `validationState="error"` or `validationState="success"` with a meaningful `validationMessage` rather than rendering an unrelated validation label.
- Keep labels associated with controls. The atom generates a stable ID when one is not supplied.

  ```jsx
  <Input
    id="project-name"
    label="Project name"
    value={projectName}
    onChange={(event) => setProjectName(event.target.value)}
    validationState={error ? "error" : undefined}
    validationMessage={error}
    required
  />
  ```

### Icon

- Source: `Frontend/src/Components/atoms/Icon/Icon.jsx`
- Icon names: `Frontend/src/Components/atoms/Icon/icon-names.js` (generated; do not edit manually)
- Styles: `Frontend/src/Components/atoms/Icon/Icon.css`
- Import:

  ```jsx
  import { Icon } from "../../Components/atoms/Icon/Icon";
  ```

- Use a name from `ICON_NAMES`. Available names include `add-user-male`, `calendar`, `check-mark`, `done`, `file`, `lock`, `multiply`, `pencil`, `plus-math`, `spinner`, `user`, and `worker`.
- `size` supports `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, and `button`.
- `gradient` supports `primary`, `inverted`, `disabled`, and `success`; pass `gradient={null}` when the SVG sprite should be used without the gradient background.
- Decorative icons are `aria-hidden` by default. Supply `label` when the icon itself conveys information.
- If a new source SVG is added under `Frontend/public/icons/`, run `npm run icons` from `Frontend/` to regenerate icon assets and names.

### ToggleSwitch

- Source: `Frontend/src/Components/atoms/ToggleSwitch/ToggleSwitch.jsx`
- Styles: `Frontend/src/Components/atoms/ToggleSwitch/ToggleSwitch.css`
- Import:

  ```jsx
  import ToggleSwitch from "../../Components/atoms/ToggleSwitch/ToggleSwitch";
  ```

- Use it for a boolean setting. It forwards native checkbox props such as `checked`, `defaultChecked`, `onChange`, `disabled`, and `name`.
- Provide `label` unless the surrounding UI already supplies an equivalent accessible name.

  ```jsx
  <ToggleSwitch
    label="Email notifications"
    checked={emailNotifications}
    onChange={(event) => setEmailNotifications(event.target.checked)}
  />
  ```

### RadioButton

- Source: `Frontend/src/Components/atoms/RadioButton/RadioButton.jsx`
- Styles: `Frontend/src/Components/atoms/RadioButton/RadioButton.css`
- Import:

  ```jsx
  import RadioButton from "../../Components/atoms/RadioButton/RadioButton";
  ```

- Use it for one option in a radio group. Provide the same `name` to related radio buttons and forward native radio props such as `value`, `checked`, `onChange`, and `disabled`.
- Provide a visible `label` or an equivalent accessible name.
- Props include `label`, `id`, `className`, `style`, and `size`; the atom generates a stable input ID when `id` is omitted.
- `size` defaults to `md`. Use `size="md"` for the compact control (22px outer circle with a 10px selected dot); `size="lg"` uses the base dimensions. The shared `name` keeps options mutually exclusive.
- Radio sizing tokens are defined in the `sizing` group and wired through `componentStyles.radioButton` in `themePrimitives.js`; do not add or edit generated CSS variables directly.

  ```jsx
  <RadioButton
    size="md"
    name="report-duration"
    value="today"
    checked={duration === "today"}
    onChange={() => setDuration("today")}
    label="Today"
  />
  ```

### StatusChips

- Source: `Frontend/src/Components/atoms/StatusChips/StatusChips.jsx`
- Styles: `Frontend/src/Components/atoms/StatusChips/StatusChips.css`
- Import:

  ```jsx
  import StatusChips from "../../Components/atoms/StatusChips/StatusChips";
  ```

- Use it for compact, non-interactive status values.
- Built-in status-to-tone mappings are `ongoing` → orange, `completed`/`approved` → green, `draft` → gray, `upcoming` → blue, and `cancelled`/`rejected` → red.
- Use `label` for display text and `tone` only when the default mapping does not express the intended meaning.

  ```jsx
  <StatusChips status="completed" label="Completed" />
  ```

### Popup notifications

- Atom source: `Frontend/src/Components/atoms/Popup/Popup.jsx`
- Context hook: `Frontend/src/contexts/usePopup.js`
- Provider: `Frontend/src/contexts/PopupProvider.jsx`
- The provider is mounted by `Frontend/src/App.jsx`.
- For new success/error notifications, use `showPopup` from `usePopup`; do not use React Toastify.

  ```jsx
  import usePopup from "../../contexts/usePopup";

  const { showPopup } = usePopup();

  showPopup({
    title: "Saved",
    message: "The project was updated.",
    variant: "success",
  });
  ```

- Supported variants are `success` and `error`. `duration` defaults to 3000 ms; use `duration: 0` only when the popup must remain until dismissed.
- Do not call `usePopup` outside `PopupProvider`.

## CSS and theme variables

### Source of truth

Theme tokens belong in `Frontend/src/shared-theme/themePrimitives.js`. The file contains grouped exports such as:

- `gray`: grayscale palette
- `colorSchemes`: MUI palette values
- `fontSizing` and `fontWeight`: typography tokens
- `sizing`: dimensions and spacing
- `colors`: component colors
- `motion`: transition durations and easing
- `effects`: opacity and interaction effects
- `shape`: radii and borders
- `componentStyles`: inline custom-property maps used by atoms

Add a token to the appropriate existing group. Use a clear camelCase key because the generator converts it to kebab-case.

### Generated variables

`Frontend/src/utils/variablesGenerator.mjs` generates `Frontend/src/shared-theme/variables.css` from the primitive exports. The generated file is imported globally by `Frontend/src/main.jsx`.

Run this command from `Frontend/` after changing theme primitives:

```bash
npm run variables
```

Never edit `Frontend/src/shared-theme/variables.css` manually; it is generated and begins with an `AUTO-GENERATED FILE` notice.

The generator emits variables in these namespaces:

- palette: `--palette-primary-main`
- font: `--font-body-font-size`
- sizing: `--button-height`
- color: `--color-input-error`
- motion: `--motion-fast-duration`
- effect: `--effect-disabled-opacity`
- shape: `--shape-*`
- font weight: `--font-weight-*`
- activate account: `--activate-account-*`

Use the generated variables in CSS:

```css
.project-card {
  border-radius: var(--shape-card-radius);
  color: var(--palette-text-primary);
  transition: background-color var(--motion-fast-duration) var(--motion-easing);
}
```

If a token is needed by an atom's inline `componentStyles` map, add the corresponding mapping in `themePrimitives.js` as well as the primitive value, then regenerate the CSS variables.

### Styling rules

- Keep component JSX and CSS in separate files.
- Prefer existing variables over hard-coded colors, spacing, radii, font sizes, and motion values.
- Put reusable design tokens in `themePrimitives.js`; put component-specific selectors and layout rules in the component CSS file.
- Do not edit generated CSS or generated icon files directly.
- Respect `prefers-reduced-motion` for new animations and transitions.
- Do not apply shimmer/skeleton effects to icons, photos, or decorative assets. Restrict loading placeholders to backend-dependent text/data.

## Validation checklist

From `Frontend/`, run the smallest relevant checks:

```bash
npm run variables
npm run lint
```

Also run `npm run icons` when icon source files change, and run the relevant build or tests when behavior requires it.
