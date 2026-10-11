---
name: Culinary Sun
colors:
  surface: '#fff8f7'
  surface-dim: '#efd4d3'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0f0'
  surface-container: '#ffe9e8'
  surface-container-high: '#fde2e1'
  surface-container-highest: '#f7dcdc'
  on-surface: '#261818'
  on-surface-variant: '#544434'
  inverse-surface: '#3d2c2c'
  inverse-on-surface: '#ffedec'
  outline: '#877361'
  outline-variant: '#dac2ad'
  surface-tint: '#8a5100'
  primary: '#8a5100'
  on-primary: '#ffffff'
  primary-container: '#ff9a00'
  on-primary-container: '#653a00'
  inverse-primary: '#ffb86d'
  secondary: '#645d54'
  on-secondary: '#ffffff'
  secondary-container: '#ebe1d5'
  on-secondary-container: '#6a635a'
  tertiary: '#43664d'
  on-tertiary: '#ffffff'
  tertiary-container: '#95bb9d'
  on-tertiary-container: '#2a4b34'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcbd'
  primary-fixed-dim: '#ffb86d'
  on-primary-fixed: '#2c1600'
  on-primary-fixed-variant: '#693c00'
  secondary-fixed: '#ebe1d5'
  secondary-fixed-dim: '#cec5ba'
  on-secondary-fixed: '#1f1b14'
  on-secondary-fixed-variant: '#4c463d'
  tertiary-fixed: '#c5eccc'
  tertiary-fixed-dim: '#aad0b1'
  on-tertiary-fixed: '#00210e'
  on-tertiary-fixed-variant: '#2c4e36'
  background: '#fff8f7'
  on-background: '#261818'
  surface-variant: '#f7dcdc'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1.25rem
  margin-md: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an appetizing, uplifting, and tactile culinary experience. Designed for passionate home cooks, mindful eaters, and daily meal planners, the aesthetic replaces clinical kitchen utility with warmth, sensory delight, and effortless discovery.

The design identity marries warm minimalism with tactile softness. It balances deep culinary hues with bright, sun-kissed citrus accents, evoking morning light across fresh ingredients on a kitchen counter. Interactions feel organic, welcoming, and generous, utilizing soft geometry, pillow-like depth, and generous whitespace that invites browsing without sensory fatigue.

## Colors

The palette draws directly from natural foods and sunlit kitchen spaces:

- **Primary (`#FF9A00`):** Amber zest. Used for primary CTAs, active tab indicators, key badges, and interactive focal points. It commands attention without introducing warning or danger semantics.
- **Secondary (`#FDF3E7`):** Warm milk froth. Acts as the primary page canvas and soft container fill, grounding the interface in comforting, non-sterile warmth compared to stark cool whites.
- **Tertiary (`#84A98C`):** Fresh sage. Applied sparingly for botanical/produce badges, dietary tags (vegetarian, organic), and soothing confirmation states.
- **Neutral (`#433232`):** Espresso charcoal. A warm, rich brown-black used for crisp headings, readable body text, and dark structural accents. It offers strong contrast while eliminating the harshness of pitch black `#000000`.

### Functional Pairings
Pure white (`#FFFFFF`) is reserved for card surfaces and elevated content tiles, creating a crisp distinction over the `#FDF3E7` background. Subtle pastel washes (such as pale tomato red, soft yolk yellow, and leaf green) provide thematic backgrounds for ingredient icons.

## Typography

Plus Jakarta Sans powers all typographical levels. Its contemporary geometric curves, wide apertures, and friendly rounded terminals provide clarity and culinary optimism.

- **Headlines:** Set with tight negative letter tracking and heavy weights (`700` and `600`) to create confident, friendly anchors for recipe names and section headers.
- **Body:** Uses regular (`400`) weight with generous line heights to preserve effortless legibility while reading kitchen steps at arm's length.
- **Labels & Metadata:** Rendered in medium and semi-bold weights (`600`) with slight positive tracking to ensure cooking durations, calorie badges, and ingredient quantities remain instantly scannable.

## Layout & Spacing

The layout model is optimized primarily for mobile-first touch interfaces, utilizing a 4-column layout on handheld devices, scaling to an 8-column layout on tablets and a 12-column fixed grid on desktop screens.

### Grid & Margins
- **Mobile Screen Boundary:** A persistent screen margin of `margin` (20px / `1.25rem`) provides edge-to-edge comfort, framing card tiles neatly against the warm canvas.
- **Horizontal Carousels:** Featured categories and recent items bleed past the margin into an edge-swipe rail with `space-md` gaps.
- **Card Padding:** Content containers leverage `space-md` (16px) or `space-lg` (24px) internal clearance, giving photography and typographic hierarchy room to breathe.

## Elevation & Depth

Visual hierarchy relies on soft, diffused ambient drop shadows tinted with warm espresso undertones rather than cold grays. This replicates natural daylight bouncing across kitchen tables.

- **Level 0 (Canvas):** The baseline creamy canvas (`#FDF3E7`) where content sits flat.
- **Level 1 (Cards & Tile Surfaces):** Pure white cards (`#FFFFFF`) float using a double shadow formula: `0 4px 16px rgba(67, 50, 50, 0.04), 0 1px 4px rgba(67, 50, 50, 0.02)`.
- **Level 2 (Floating Action Buttons & Overlays):** Interactive floating buttons, heart bookmarks, and active navigation bars lift using `0 8px 24px rgba(67, 50, 50, 0.08), 0 2px 6px rgba(67, 50, 50, 0.04)`.
- **Level 3 (Modals & Sheet Drawers):** Bottom instruction sheets and search overlays project `0 16px 40px rgba(67, 50, 50, 0.12)`.

## Shapes

The design system adopts a Pill-shaped (`3`) structural profile, infusing the UI with friendliness, approachability, and organic warmth.

- **Interactive Controls:** All buttons, search fields, category chips, and filter tags utilize full pill radiuses (`border-radius: 9999px`).
- **Cards & Media:** Recipe photo cards and instruction modules use `rounded-lg` (32px / `2rem`) to soften imagery and align with modern mobile hardware contours.
- **Sheet Drawers:** Bottom sheets feature large `rounded-xl` (48px / `3rem`) curvature on top corners.

## Components

### Buttons
- **Primary Button:** Filled `#FF9A00` background with pure white text, bold label typography, pill-shaped (`9999px`), with horizontal padding of `space-lg` and vertical padding of `space-md`. Soft amber shadow on hover or active press.
- **Secondary Button:** Soft `#FDF3E7` fill or pure white card surface with `#433232` typography, accompanied by subtle espresso-tinted ambient elevation.
- **Icon Actions:** Circular (44px × 44px) button with pure white or translucent surface (`rgba(255, 255, 255, 0.85)` with backdrop blur) housing subtle iconography (such as heart bookmarks or back arrows).

### Search Field
- Pill-shaped full-width input container filled with pure `#FFFFFF`, featuring an espresso magnifying icon (`space-md` leading indent), light placeholder text (`#433232` at 40% opacity), and zero heavy borders. Soft Level 1 elevation separates it from the creamy screen background.

### Category & Recipe Chips
- **Category Tiles:** Vertically aligned pill or rounded squircle tiles with a vibrant orange or warm background, topped with an organic photograph of food, holding centered bold text below.
- **Ingredient Chips:** Compact square-rounded tiles (64px to 72px) with pastel tinted backgrounds (e.g., light red for tomatoes, soft yellow for cheese, pale mint for greens) containing a centered ingredient image, accompanied by bold name and quantity labels underneath.

### Cards
- **Recipe Showcase Card:** Pure white `#FFFFFF` surface featuring a prominent rounded top or bleed image, rounded corners (`2rem`), bold recipe title in `#433232`, metadata row (prep time, calories, serving count accompanied by soft orange mini-icons), and a floating favorite heart button.

### Lists & Cooking Steps
- Step numbers presented in rounded pill or badge containers using tinted `#FF9A00` backgrounds with white bold digits.
- Accompanying text formatted in `body-lg` espresso charcoal with generous `space-md` paragraph separation.

### Checkboxes & Radio Controls
- Circular, pill-aligned selection toggles utilizing `#FF9A00` when active with a pure white checkmark; unselected states feature a soft cream border (`2px solid rgba(67, 50, 50, 0.15)`).