# Design Guidelines: Multi-Tenant Budget Management Application

## Design Approach

**Selected Approach:** Design System with Reference-Based Inspirations

Drawing from modern financial and productivity tools:
- **Linear**: Clean typography, focused layouts, minimal distractions
- **Mercury/Ramp**: Professional financial dashboards with clear data hierarchy
- **Stripe Dashboard**: Intuitive navigation and data presentation
- **Notion**: Multi-workspace switching patterns

**Core Principles:**
1. Clarity over decoration - financial data must be immediately comprehensible
2. Consistent patterns - reduce cognitive load for repetitive tasks
3. Trust through professionalism - clean, stable interface
4. Speed and efficiency - minimize clicks to complete common workflows

---

## Core Design Elements

### A. Color Palette

**Light Mode (Primary):**
- Primary Blue: 220 70% 50% - navigation, CTAs, active states
- Text Primary: 220 15% 20% - body text, headings
- Text Secondary: 220 10% 50% - labels, meta information
- Background: 0 0% 100% - main background
- Surface: 220 15% 97% - cards, elevated elements
- Border: 220 10% 90% - dividers, table borders
- Success Green: 140 50% 45% - positive transactions, income
- Error Red: 0 65% 55% - expenses, alerts
- Warning Amber: 35 90% 55% - pending items, notifications

**Dark Mode:**
- Primary Blue: 220 70% 60% - navigation, CTAs
- Text Primary: 220 15% 90% - body text
- Text Secondary: 220 10% 70% - labels
- Background: 220 15% 10% - main background
- Surface: 220 15% 15% - cards
- Border: 220 10% 25% - dividers

### B. Typography

**Font Families:**
- Primary: Inter (via Google Fonts) - all UI text
- Monospace: JetBrains Mono - financial figures, transaction IDs

**Type Scale:**
- Headings: text-2xl/text-3xl font-semibold
- Page Titles: text-xl font-semibold
- Body: text-sm/text-base font-normal
- Labels: text-xs/text-sm font-medium uppercase tracking-wide
- Financial Figures: text-base/text-lg font-mono font-medium

### C. Layout System

**Spacing Units:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4 to p-6
- Section spacing: gap-8 to gap-12
- Card spacing: p-6
- Form field spacing: gap-4

**Grid System:**
- Main content: max-w-7xl mx-auto
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Transaction lists: Full width with appropriate max-width
- Forms: max-w-2xl for focused data entry

---

## D. Component Library

### Navigation
**Top Navigation Bar:**
- Fixed header with business/organization switcher (dropdown, prominent placement)
- User avatar and role badge in top-right
- Height: h-16, with shadow-sm
- Business switcher shows organization name, type badge (Non-Profit/For-Profit)

**Sidebar Navigation:**
- Fixed left sidebar, w-64
- Collapsible on mobile
- Sections: Dashboard, Transactions, Reports, Grants (conditional), Settings
- Active state: bg-primary with text-white, inactive: text-secondary
- Icons from Heroicons (outline style)

### Dashboard Components
**Metric Cards:**
- 3-column grid on desktop
- White/surface background with subtle border
- Large financial figure (text-3xl font-mono)
- Label above (text-xs uppercase tracking-wide text-secondary)
- Trend indicator (small arrow + percentage)
- Padding: p-6, rounded-lg

**Transaction Summary:**
- Table layout with sticky header
- Columns: Date, Description, Category, Amount
- Alternating row colors (subtle)
- Amount column: right-aligned, color-coded (green for income, red for expense)
- Hover state: subtle background highlight

### Forms & Data Entry
**Input Fields:**
- Standard height: h-10
- Border: border-2 with focus:ring-2 focus:ring-primary
- Labels: text-sm font-medium mb-2
- Dark mode: bg-surface with lighter border

**Transaction Entry Form:**
- Horizontal layout for quick entry
- Fields: Date picker, Amount, Category dropdown, Description
- Inline validation
- Quick-add button always visible

**Category Selector:**
- Dropdown with search
- Color-coded categories (using subtle background colors)
- Recently used categories at top

### Reports
**Report Header:**
- Date range selector (start/end dates)
- Export button (CSV/PDF)
- Filter controls (category, business)

**Financial Tables:**
- Clean, professional appearance
- Hierarchical indentation for sub-categories
- Totals in bold with border-top-2
- Percentage columns right-aligned
- Font-mono for all numbers

### Grant Tracking (Non-Profits)
**Grant Cards:**
- Card layout with progress bar
- Grant name, total amount, spent amount
- Restrictions/notes section
- Associated transactions link
- Status badge (Active, Completed, Pending)

### Data Displays
**Transaction List:**
- Infinite scroll or pagination
- Filter bar with search, date range, category
- Bulk select capability
- Quick categorize actions
- Amount highlighting based on type

**Empty States:**
- Centered icon (from Heroicons)
- Helpful message: "No transactions yet"
- Primary CTA to add first transaction
- Light illustration or icon, never complex graphics

---

## E. Interaction Patterns

**Business Switching:**
- Dropdown in top nav showing current business
- Quick keyboard shortcut (⌘/Ctrl + K for search)
- Visual distinction between non-profit and for-profit (subtle badge)

**Role-Based UI:**
- Hide/disable actions based on user role
- Clear visual indicators for read-only access
- Admin features clearly separated

**Animations:**
- Minimal, purposeful only
- Sidebar collapse/expand: transition-all duration-200
- Modal overlays: fade-in, no elaborate entrances
- Loading states: simple spinner, no skeleton screens unless list-heavy

---

## Images

**No hero images** - This is an application interface, not marketing site.

**Iconography:**
- Heroicons (outline) throughout for consistency
- Financial icons: currency symbols, chart icons, folder icons
- Business type indicators: small badge icons
- Always paired with text labels for clarity

---

## Key UX Principles

1. **Multi-tenant clarity:** Always show which business context user is in
2. **Quick data entry:** Forms optimized for speed, keyboard navigation
3. **Clear financial hierarchies:** Use typography and spacing, not color alone
4. **Trust signals:** Professional, stable design; avoid trendy elements
5. **Accessibility:** WCAG AA compliance, dark mode fully supported
6. **Responsive:** Mobile-first for transaction review, desktop-optimized for data entry

This design creates a professional, trustworthy financial management tool that prioritizes clarity and efficiency over visual flourishes.