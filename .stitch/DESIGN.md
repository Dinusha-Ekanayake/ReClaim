---
name: ReClaim Community Recovery
colors:
  canvas: '#F7FAFC'
  surface: '#FFFFFF'
  surface-muted: '#EEF3F8'
  ink: '#10233F'
  ink-muted: '#5B687A'
  border: '#DCE5EE'
  primary: '#1E63A7'
  primary-hover: '#174F87'
  on-primary: '#FFFFFF'
  found: '#159B62'
  lost: '#D94A5A'
  warning: '#B7791F'
  error: '#C53F4F'
  dark-canvas: '#07111F'
  dark-surface: '#0D1A2B'
  dark-border: '#22334A'
typography:
  display:
    fontFamily: Outfit
    fontWeight: '700'
    letterSpacing: -0.025em
  body:
    fontFamily: DM Sans
    fontWeight: '400'
    lineHeight: '1.6'
  mono:
    fontFamily: JetBrains Mono
    fontWeight: '500'
rounded:
  control: 0.875rem
  card: 1.5rem
  feature: 2rem
  full: 9999px
spacing:
  unit: 4px
  control-gap: 8px
  card-padding: 24px
  section-mobile: 56px
  section-desktop: 96px
  margin-mobile: 16px
  margin-desktop: 32px
---

# Design System: ReClaim Community Recovery

## 1. Visual Theme & Atmosphere

ReClaim is a calm civic utility for Sri Lankan communities: trustworthy enough for identity-sensitive handovers, warm enough to encourage neighbours to help, and direct enough to use while someone is stressed about a missing belonging. Its density is balanced (5/10), layout variance is purposeful but restrained (5/10), and motion is fluid rather than theatrical (4/10).

The correct `logo.png` and `favicon.png` are the only brand marks. Deep recovery blue anchors navigation and primary actions. Green is not a second decorative accent; it is reserved for Found, returned, connected, and successful states. Muted red is reserved for Lost, destructive, and urgent states. The background may suggest a living community network, but it never exposes exact locations, invents activity, or competes with task content.

## 2. Color Palette & Roles

### Primary Foundation

- **Community Canvas** (`#F7FAFC`) — quiet app background with a cool, civic tone.
- **Clear Surface** (`#FFFFFF`) — forms, menus, and raised task regions.
- **Soft Utility Surface** (`#EEF3F8`) — segmented controls, secondary panels, and skeletons.
- **Night Canvas** (`#07111F`) and **Night Surface** (`#0D1A2B`) — dark-mode layers; never pure black.
- **Whisper Border** (`#DCE5EE`) / **Night Border** (`#22334A`) — structure without card-box clutter.

### Accent & Interactive

- **Recovery Blue** (`#1E63A7`) — the one interactive accent for links, primary buttons, focus rings, and active navigation.
- **Recovery Blue Pressed** (`#174F87`) — hover/pressed depth without neon glow.

### Typography & Text Hierarchy

- **Trust Ink** (`#10233F`) — primary headings and body emphasis.
- **Neighbour Slate** (`#5B687A`) — descriptions, metadata, and helper copy at accessible contrast.
- **On Primary** (`#FFFFFF`) — text/icons on Recovery Blue.

### Functional States

- **Found Green** (`#159B62`) — found items, connected realtime status, returned/success.
- **Lost Rose** (`#D94A5A`) — lost items and destructive actions; do not use as decoration.
- **Caution Ochre** (`#B7791F`) — claim review and recoverable warnings.
- **Error Rose** (`#C53F4F`) — validation and failed operations with text/icon reinforcement.

## 3. Typography Rules

### Hierarchy & Weights

- **Display:** Outfit, weight 700–800, tight tracking, responsive `clamp()` sizing. Hero copy is left-aligned and limited to a readable measure.
- **Body:** DM Sans, weight 400–600, relaxed leading, maximum 65 characters per line for long prose.
- **Metadata:** DM Sans 12–14px with sufficient contrast; never use 10px gray text for required information.
- **Numbers/technical values:** JetBrains Mono for match percentages, IDs, coordinates, and high-density admin values.
- Sinhala and Tamil text must use capable system fallbacks without shrinking or clipped line-height.

### Spacing Principles

Use a 4px base rhythm with common gaps of 8, 12, 16, 24, 32, 48, 64, and 96px. Controls are at least 44px tall. Major sections use `clamp(3.5rem, 8vw, 6rem)` vertical spacing and 16px mobile/32px desktop edge padding.

## 4. Component Stylings

### Buttons

Primary buttons use Recovery Blue, white text, a 14px radius, and a small inset/ambient shadow. Hover changes color and lifts at most 1px; active feedback translates 1px or scales to 0.985 without overriding existing transforms. Secondary actions use a border or soft surface. Destructive actions require explicit red labeling and confirmation. Every icon-only button has a visible tooltip or accessible name.

### Cards & Recovery Surfaces

Use 24px cards only when elevation communicates grouping. Static metrics use flat surfaces or dividers and never lift on hover. Clickable item cards have one consistent border, a restrained shadow, visible focus, image zoom of no more than 1.02, and a clear arrow/action cue. Large hero/workflow containers use 32px corners.

### Navigation

Desktop navigation is an 80px translucent surface with a crisp bottom border after scrolling. Mobile keeps the logo, search, and one menu trigger; language, theme, account, notifications, and secondary actions live inside an accessible sheet. Active state is query-aware for Lost/Found routes.

### Inputs & Forms

Labels remain above fields and are programmatically associated. Inputs are at least 44px high, 14px rounded, with helper text below and inline errors tied through `aria-describedby`. Segmented Lost/Found controls use Lucide icons plus words, never emoji alone. Multi-step posting always preserves drafts and explains location privacy.

### Item, Claim, Chat, and Status Components

Lost and Found are functional badges using rose/green plus text/icons. Ownership questions show their exact question beside the claimant answer. Chat messages preserve drafts until acknowledged, expose reconnecting/failed states, and keep timestamps visible. Loading uses dimension-matched skeletons; empty states explain the next valid action.

## 5. Layout Principles

### Grid & Structure

Use CSS Grid with a 1400px maximum shell. Public heroes use an asymmetric text/activity split on desktop and a single readable column below 1024px. Dashboard/sidebar layouts reserve stable navigation width and never duplicate the navbar offset. Avoid three identical marketing cards; workflows may use a timeline or asymmetric grouped steps.

### Whitespace Strategy

Whitespace separates tasks, not every field into a separate card. High-density admin lists prefer tables/dividers on desktop and record cards on mobile. Avoid nested cards and redundant borders.

### Alignment & Visual Balance

Public headings are left-aligned except compact factual sections. Real recent reports and aggregate API data can carry visual weight; unsupported imagery, fake statistics, and decorative dashboards cannot.

### Responsive Behavior & Touch

All multi-column regions collapse below 768px. No horizontal document scrolling is permitted. Use `min-width: 0` on grid/flex children, allow long Sinhala/Tamil text to wrap, keep 44px targets, and position menus within viewport safe areas. Full-height screens use `100dvh` math based on the real 80px navbar.

## 6. Motion & Interaction

Use the shared premium easing `cubic-bezier(0.16, 1, 0.3, 1)` for 160–320ms state transitions. Animate transform and opacity only. Route transitions fade without retaining a transform, lists reveal with light stagger, and drawers preserve spatial continuity. Background paths may drift slowly, while rotating rings, bouncing emoji, constant shimmers, and simultaneous perpetual animations are banned. `prefers-reduced-motion` and Framer Motion's user setting must eliminate nonessential movement.

## 7. Design System Notes for Stitch Generation

### Language to Use

Describe ReClaim as a calm, trusted community recovery network; civic utility; privacy-aware handover; asymmetric, airy, and task-led. Use Sri Lankan place context only when backed by user/report data.

### Component Prompts

- “Create a responsive lost-and-found browse screen with an 80px translucent navbar, URL-synced Lost/Found tabs, one blue primary accent, functional green/red status colors, 24px item cards, real report photography, and a composed no-results state.”
- “Create a delivery-safe chat workspace with item context, connection status, persistent drafts, acknowledged message states, a responsive conversation sidebar, and 44px controls.”
- “Create a four-step item report flow that preserves progress, supports approximate area plus optional map coordinates, explains location privacy, uploads real photos, and collects finder-authored ownership questions.”

### Incremental Iteration

Generate one task flow at a time and preserve route/API contracts. Test at 390px, 768px, and 1440px before adding decorative motion. Never generate fabricated success rates, testimonials, user counts, “near you” claims without coordinates, placeholder links, generic names, or system metrics.

## 8. Anti-Patterns (Banned)

- No pure black, neon glows, purple AI gradients, custom cursors, or excessive gradient text.
- No emoji as core product controls; use the Lucide icon system with text.
- No overlapping text/images, horizontal mobile overflow, hover-only actions, or sub-44px controls.
- No equal three-card marketing rows, nested card grids, or lift effects on noninteractive surfaces.
- No fake numbers, “thousands of users,” unverified timing claims, dummy moderation notes, or unsupported proximity claims.
- No exact public coordinates, silent failed mutations, lost chat drafts, or mixed-language core workflows.
