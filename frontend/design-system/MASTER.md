# Design System: Wise (Reino Canino)

Source: [awesome-design-md-google-stitch/design-md/wise](https://github.com/asadravian/awesome-design-md-google-stitch/tree/main/design-md/wise)

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Near Black | `#0e0f0c` | Primary text, dark panel |
| Wise Green | `#9fe870` | Primary CTA, accents |
| Dark Green | `#163300` | Text on green buttons |
| Light Mint | `#e2f6d5` | Agent bubbles, soft surfaces |
| Gray | `#868685` | Muted text |
| Light Surface | `#e8ebe6` | Secondary backgrounds |
| Danger | `#d03238` | Errors |

## Typography

- **Font**: Inter (Wise Sans fallback)
- **Display**: weight 900, tight line-height
- **Body default**: weight 600 for emphasis, 400 for long text
- **Feature**: `font-feature-settings: "calt" 1`

## Components

- **Buttons**: pill (`rounded-full`), green bg + dark green text, scale 1.05 hover / 0.95 active
- **Cards**: 30px radius, ring shadow `rgba(14,15,12,0.12) 0 0 0 1px`
- **No heavy drop shadows** — depth via rings and color contrast

## Libraries

- **shadcn/ui** — base primitives
- **Magic UI** — shimmer-button, animated-shiny-text, dot-pattern
