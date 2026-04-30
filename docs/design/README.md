# Design References

This directory stores visual concept references for Entyping UI work.

## Lesson Selection Concept

File: `lesson-selection-concept.png`

Purpose:

- Concept reference for the lesson and part selection screen.
- Target audience direction: Japanese middle school to high school students.
- Desired tone: friendly, clear, study-focused, and lightly playful without feeling childish.

Implementation notes:

- Use the image as visual direction, not as a pixel-perfect specification.
- Borrow the strong unit hierarchy, expandable unit rows, separated progress badges, and prominent `Start` actions.
- Keep unimplemented gamification such as points or streaks out of the production UI until the app has real data for them.
- Prefer a simpler first implementation: colored unit rails, clean part rows, compact progress badges, and a quiet settings entry point.

## Practice Screen Concept

File: `practice-screen-concept.png`

Purpose:

- Concept reference for the typing practice screen.
- Target audience direction: the same friendly Japanese middle-school/high-school study app tone as the lesson selection concept.
- Desired tone: focused, encouraging, and game-like enough to feel motivating without turning into a full arcade UI.

Implementation notes:

- Use the image as atmosphere and product-direction reference, not as a literal UI specification.
- The current app practices full sentence items, while the concept image is more word/vocabulary oriented. Keep the current implementation model unless the product scope changes.
- Borrow the clear practice hierarchy: large current prompt, visible progress, right-side stats, and strong action controls.
- Treat streaks, points, keyboard shortcuts, and missed-word counters as future feature ideas unless backed by real app data.
- Prefer incremental implementation: align typography, spacing, stats cards, and prompt focus first before adding new mechanics.

## Font Direction

Preferred first choice: `M PLUS Rounded 1c`.

Reasons:

- Supports both Japanese and Latin text.
- Matches the friendly middle-school/high-school study app direction.
- Feels approachable without being too childish.
- Keeps Japanese labels, English labels, and progress badges visually consistent.

Suggested CSS stack:

```css
font-family: "M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif;
```

Initial implementation can use Google Fonts for speed:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&display=swap" rel="stylesheet">
```

If offline or local-first behavior becomes important, self-host this font later.

## Production UI Direction

Use generated images as concept references, not as the first source of production UI assets.

Near-term implementation should be CSS-first:

- Build the app atmosphere with gradients, soft color blobs, dotted patterns, angled shapes, borders, and card treatments.
- Add a simple `Entyping` brand/header treatment in HTML/CSS before considering a bitmap logo.
- Use inline SVG or CSS shapes for small decorative marks and icons when practical.
- Avoid production bitmap backgrounds for now. They are harder to tune across viewport sizes, add file-management overhead, and can drift stylistically from the rest of the UI.
- Consider generated SVG/PNG assets later only for specific needs that CSS cannot cover well, such as custom illustrations.

Lesson selection should move toward unit-based visual themes:

- Give each unit a stable accent color.
- Use that color strongly in the unit header and softly in related elements such as borders, badges, open-state backgrounds, and small controls.
- Keep unit images out of scope for now; the visual identity should come from color, spacing, and card structure.
- Keep action colors consistent at first. `Start`, `Next`, and other forward actions can remain green even when unit theme colors vary.
- Prefer a reusable color cycle through CSS custom properties, such as `--unit-accent`, `--unit-soft`, and `--unit-border`.

## Current UI Screenshots

Routine UI screenshots should be generated locally and are not committed by default.

When making UI-facing changes, capture fresh screenshots as appropriate and use them to review layout, spacing, typography, and responsive behavior before committing. This is especially important for changes to the lesson selection screen, practice screen, completion dialog, typography, colors, or responsive layout.

Workflow:

1. Start the dev server:

   ```sh
   npm run dev
   ```

2. In another terminal, capture screenshots:

   ```sh
   npm run screenshots
   ```

3. Review the generated files under `tmp/screenshots/`.

The screenshot script captures desktop and mobile views for both the contents screen and a representative practice route. The generated output is ignored by Git; commit screenshots only when they are intentional design references.

The script uses the Playwright CLI. If system Google Chrome is installed, it uses Playwright's `chrome` channel so a separate Playwright browser download is not required.
