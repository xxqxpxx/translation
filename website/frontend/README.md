# LinguaLink Frontend

> **Modern, responsive React application with ELS-inspired design system**

## 🎨 Design System

The LinguaLink frontend features a comprehensive design system based on the **Exchange Language Services (ELS)** website color palette, optimized for both web and mobile experiences.

### Color Palette

**Primary Colors (Blue/Navy)**
- Primary: `#1976d2` - Main navigation and primary actions
- Primary Dark: `#0d47a1` - Navigation background and hover states
- Primary Light: `#42a5f5` - Focus indicators and accents

**Secondary Colors (Orange/Amber)**  
- Secondary: `#ff9800` - Headers and call-to-action elements
- Secondary Dark: `#f57c00` - Hover states and emphasis
- Secondary Light: `#ffca28` - Light accents and highlights

**Neutral Colors**
- Grey scale from `#fafafa` to `#212121` for text and backgrounds
- Semantic colors for success, warning, error, and info states

### Typography

**Font Family**: Roboto (with Helvetica Neue and Arial fallbacks)

**Responsive Font Sizes**:
- **Mobile**: Smaller font sizes optimized for small screens
- **Desktop**: Larger, more readable font sizes for bigger displays
- **Headings**: Scale from 1rem to 3rem with responsive adjustments

### Responsive Design

**Mobile-First Approach**
- Breakpoints: 600px (sm), 900px (md), 1200px (lg), 1536px (xl)
- Touch-friendly interactions (44px+ touch targets)
- Mobile bottom navigation for easy thumb navigation
- Responsive typography and spacing

**Layout Components**
- Sticky header with mobile hamburger menu
- Desktop horizontal navigation
- Mobile bottom navigation (4 main items)
- Responsive grid system (1-4 columns)
- Touch-optimized buttons and inputs

## 🚀 Key Features

### Mobile Optimization
- **Touch Targets**: Minimum 44px (48px on mobile) for accessibility
- **Bottom Navigation**: Easy thumb access to main features
- **Responsive Images**: Optimized for different screen densities
- **Mobile Menu**: Slide-out drawer navigation
- **Scroll to Top**: Floating action button for long pages

### Accessibility
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user motion preferences
- **Focus Management**: Clear focus indicators
- **Screen Reader**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full keyboard support

### Performance
- **CSS Custom Properties**: Efficient styling with CSS variables
- **Minimal Dependencies**: Lightweight design system
- **Optimized Assets**: Compressed images and fonts
- **Lazy Loading**: Progressive content loading
- **Service Worker Ready**: PWA capabilities

## 📱 Component Library

### Buttons
```css
.btn-primary    /* Blue primary button */
.btn-secondary  /* Orange secondary button */
.btn-outlined   /* Outlined button variant */
.btn-ghost      /* Transparent button */
.btn-sm         /* Small button (32px height) */
.btn-lg         /* Large button (56px height) */
```

### Cards
```css
.card           /* Basic card container */
.card-header    /* Card header with border */
.card-title     /* Card title styling */
.card-content   /* Card content area */
```

### Layout
```css
.container      /* Responsive container (max-width: 1200px) */
.grid           /* CSS Grid container */
.grid-cols-1    /* 1 column grid */
.grid-cols-2    /* 2 column grid */
.grid-cols-3    /* 3 column grid */
.grid-cols-4    /* 4 column grid */
```

### Navigation
```css
.header         /* Sticky header */
.navbar         /* Navigation bar */
.nav-brand      /* Logo/brand area */
.nav-menu       /* Desktop navigation menu */
.bottom-nav     /* Mobile bottom navigation */
```

### Forms
```css
.input          /* Standard input field */
.form-group     /* Form field container */
.form-label     /* Form field label */
```

## 🎯 Usage Examples

### Basic Layout
```html
<div class="header">
  <nav class="navbar">
    <a href="#" class="nav-brand">LinguaLink</a>
    <ul class="nav-menu">
      <li><a href="#" class="nav-item">Home</a></li>
      <li><a href="#" class="nav-item">Services</a></li>
    </ul>
  </nav>
</div>

<main class="container">
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
    <div class="card">
      <h3 class="card-title">Service Title</h3>
      <p class="card-content">Service description...</p>
    </div>
  </div>
</main>
```

### Responsive Grid
```html
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
  <!-- Grid items automatically adjust based on screen size -->
  <div class="card">Mobile: 1 col, Tablet: 2 col, Desktop: 3 col</div>
</div>
```

### Button Variations
```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>
<button class="btn btn-outlined">Outlined Button</button>
<button class="btn btn-ghost">Subtle Action</button>
```

### Form Layout
```html
<div class="form-group">
  <label class="form-label">Email Address</label>
  <input type="email" class="input" placeholder="Enter your email">
</div>
```

## 📐 Design Guidelines

### Spacing
- **Base Unit**: 8px spacing system
- **Touch Targets**: 44px minimum (48px on mobile)
- **Container Padding**: 16px mobile, 24px desktop
- **Card Spacing**: 24px internal padding

### Colors
- **Primary**: Use for main actions and navigation
- **Secondary**: Use for headers and emphasis
- **Neutral**: Use for text and subtle backgrounds
- **Status**: Use for feedback and states

### Typography
- **Headings**: Bold weights (600-700) for hierarchy
- **Body Text**: Regular weight (400) for readability
- **Labels**: Medium weight (500) for emphasis
- **Responsive**: Scales down 20% on mobile

### Shadows
- **Cards**: Subtle shadows with hover elevation
- **Buttons**: Elevated shadows on interaction
- **Modals**: Higher elevation for prominence
- **Depth**: 5 levels from subtle to prominent

## 🔧 Customization

### CSS Custom Properties
All design tokens are available as CSS custom properties:

```css
:root {
  --color-primary: #1976d2;
  --color-secondary: #ff9800;
  --spacing-4: 16px;
  --radius-base: 8px;
  --shadow-base: 0 3px 6px rgba(0, 0, 0, 0.16);
}
```

### Theme Variations
```css
/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-default: #121212;
    --color-text-primary: #ffffff;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  :root {
    --color-primary: #0000ff;
    --shadow-base: 0 3px 6px rgba(0, 0, 0, 0.5);
  }
}
```

## 📊 Browser Support

**Modern Browsers** (Recommended)
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

**Features Used**
- CSS Custom Properties
- CSS Grid
- Flexbox
- CSS Media Queries
- CSS Transitions

**Progressive Enhancement**
- Works on older browsers with graceful degradation
- Core functionality available without JavaScript
- Accessibility features built-in

## 🚀 Performance Metrics

**Target Performance**
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.0s
- **Bundle Size**: < 500KB gzipped

**Optimization Techniques**
- CSS-in-JS with emotion for optimal bundling
- Component lazy loading
- Image optimization
- Font subsetting
- Service worker caching

## 🧪 Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing
```bash
# Run unit tests
npm run test

# Run component tests
npm run test:components

# Run end-to-end tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run typecheck
```

## 📚 Resources

- **Design Demo**: `/public/design-demo.html` - Interactive preview
- **Style Guide**: `/src/styles/designSystem.ts` - Design tokens
- **Global Styles**: `/src/styles/global.css` - Base styles
- **Components**: `/src/components/` - Reusable components

## 🤝 Contributing

1. Follow the design system guidelines
2. Maintain responsive design principles
3. Ensure accessibility compliance
4. Test on multiple devices and browsers
5. Update documentation for new components

---

**Built with modern web standards for the translation industry** 🌐 