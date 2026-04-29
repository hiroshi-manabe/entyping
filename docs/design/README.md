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
