# Code Review Memory

- [Project picture.html architecture](project_picture_html_architecture.md) — picture.html has 3 rendering paths with different quality params; preload must match each path exactly
- [F-14 lightbox press vs keyboard](review_f14_lightbox_press_escape.md) — overlay.press("Escape") works by accident; document-level keydown needs page.keyboard.press()
