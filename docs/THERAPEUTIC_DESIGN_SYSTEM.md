# Therapeutic Design System

## 🎨 Overview

The Serenity Therapeutic Design System is built to create a calming, supportive digital environment that promotes recovery and well-being. Every design decision is made with the user's mental health and emotional state in mind.

## 🌈 Color Palette

### Primary Therapeutic Colors

#### Sage (Neutral & Grounding)
```css
sage-50: #f6f7f6   /* Light background */
sage-100: #e3e7e3  /* Subtle borders */
sage-500: #5a6f5a  /* Primary text */
sage-800: #2f3b2f  /* Headings */
sage-900: #283128  /* Dark text */
```
**Usage**: Primary text, backgrounds, and neutral elements

#### Emerald (Growth & Hope)
```css
emerald-50: #ecfdf5   /* Success backgrounds */
emerald-500: #10b981  /* Primary actions */
emerald-600: #059669  /* Hover states */
emerald-700: #047857  /* Active states */
```
**Usage**: Success states, positive actions, growth indicators

#### Turquoise (Calm & Clarity)
```css
turquoise-50: #f0fdfa   /* Info backgrounds */
turquoise-500: #14b8a6  /* Secondary actions */
turquoise-600: #0d9488  /* Hover states */
turquoise-700: #0f766e  /* Active states */
```
**Usage**: Information, secondary actions, calming elements

#### Sky (Trust & Support)
```css
sky-50: #f0f9ff    /* Support backgrounds */
sky-500: #0ea5e9   /* Support actions */
sky-600: #0284c7   /* Hover states */
sky-700: #0369a1   /* Active states */
```
**Usage**: Support features, trust indicators, help elements

### Healing Accent Colors
```css
healing-hope: #10b981      /* Hope and growth */
healing-peace: #14b8a6     /* Peace and calm */
healing-strength: #0ea5e9  /* Strength and support */
healing-wisdom: #5a6f5a    /* Wisdom and grounding */
healing-comfort: #f6f7f6   /* Comfort and safety */
```

## 🎭 Animations

### Calming Animation Types

#### Fade In
```css
animation: fadeIn 0.5s ease-in-out;
```
**Usage**: Page loads, content reveals

#### Slide Up
```css
animation: slideUp 0.5s ease-out;
```
**Usage**: Form submissions, success messages

#### Scale In
```css
animation: scaleIn 0.3s ease-out;
```
**Usage**: Button interactions, modal opens

#### Float
```css
animation: float 3s ease-in-out infinite;
```
**Usage**: Background elements, decorative items

#### Pulse Gentle
```css
animation: pulseGentle 2s ease-in-out infinite;
```
**Usage**: Loading states, attention indicators

#### Breath
```css
animation: breath 4s ease-in-out infinite;
```
**Usage**: Breathing exercises, meditation features

### Animation Guidelines

1. **Duration**: Keep animations between 200ms-700ms for responsiveness
2. **Easing**: Use `cubic-bezier(0.4, 0, 0.2, 1)` for natural movement
3. **Purpose**: Every animation should serve a therapeutic purpose
4. **Accessibility**: Respect `prefers-reduced-motion` settings

## 🎨 Gradients

### Therapeutic Background Gradients

#### Primary Gradient
```css
background: linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0ea5e9 100%);
```
**Usage**: Primary buttons, important actions

#### Secondary Gradient
```css
background: linear-gradient(135deg, #5a6f5a 0%, #10b981 100%);
```
**Usage**: Secondary buttons, supporting actions

#### Calm Gradient
```css
background: linear-gradient(135deg, #f6f7f6 0%, #e3e7e3 100%);
```
**Usage**: Card backgrounds, content areas

#### Healing Gradient
```css
background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
```
**Usage**: Success states, positive feedback

#### Therapeutic Background
```css
background: linear-gradient(135deg, #f6f7f6 0%, #ecfdf5 50%, #f0f9ff 100%);
```
**Usage**: Main page backgrounds, calming environments

## 📝 Typography

### Font Hierarchy

#### Primary Font: Inter
- **Usage**: Body text, UI elements, navigation
- **Weights**: 300 (light), 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

#### Secondary Font: Merriweather
- **Usage**: Headings, quotes, important content
- **Weights**: 300 (light), 400 (normal), 700 (bold)

#### Monospace: JetBrains Mono
- **Usage**: Code, technical content, data display

### Text Scale
```css
text-xs: 0.75rem    /* Captions, small text */
text-sm: 0.875rem   /* Secondary text */
text-base: 1rem     /* Body text */
text-lg: 1.125rem   /* Large body text */
text-xl: 1.25rem    /* Subheadings */
text-2xl: 1.5rem    /* Section headings */
text-3xl: 1.875rem  /* Page headings */
text-4xl: 2.25rem   /* Hero headings */
text-5xl: 3rem      /* Large hero headings */
text-6xl: 3.75rem   /* Extra large headings */
```

## 🎯 Component Guidelines

### Button Design
```css
/* Primary Button */
.btn-primary {
  @apply bg-gradient-primary text-white font-semibold py-3 px-6 rounded-xl;
  @apply shadow-gentle hover:shadow-calm transition-all duration-300;
  @apply transform hover:scale-[1.02] disabled:transform-none;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-white/80 backdrop-blur-sm border-sage-200 text-sage-700;
  @apply hover:bg-sage-50 transition-colors duration-200;
}
```

### Card Design
```css
.card-therapeutic {
  @apply bg-white/80 backdrop-blur-sm border-sage-200 rounded-2xl;
  @apply shadow-soft hover:shadow-calm transition-all duration-300;
}
```

### Form Design
```css
.input-therapeutic {
  @apply border-sage-200 focus:border-emerald-300 focus:ring-emerald-200;
  @apply bg-white/80 backdrop-blur-sm transition-colors duration-200;
}
```

## 🎨 Usage Principles

### 1. **Calm First**
- Use soft colors and gentle transitions
- Avoid harsh contrasts or jarring animations
- Create a sense of safety and comfort

### 2. **Clarity Above All**
- Ensure text is highly readable
- Use sufficient contrast ratios
- Provide clear visual hierarchy

### 3. **Supportive Interactions**
- Every interaction should feel supportive
- Provide positive feedback for actions
- Use animations to guide users gently

### 4. **Accessibility by Design**
- Support screen readers and assistive technologies
- Respect user preferences for reduced motion
- Ensure keyboard navigation works smoothly

### 5. **Therapeutic Intent**
- Every design element should serve recovery
- Use colors and animations to reduce anxiety
- Create a sense of progress and hope

## 🚀 Implementation

### Tailwind Configuration
The therapeutic design system is implemented through custom Tailwind CSS configuration:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Therapeutic color palettes
        sage: { /* ... */ },
        emerald: { /* ... */ },
        turquoise: { /* ... */ },
        sky: { /* ... */ },
        healing: { /* ... */ }
      },
      animation: {
        // Calming animations
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'float': 'float 3s ease-in-out infinite',
        // ... more animations
      },
      backgroundImage: {
        // Therapeutic gradients
        'gradient-primary': 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0ea5e9 100%)',
        'gradient-therapeutic': 'linear-gradient(135deg, #f6f7f6 0%, #ecfdf5 50%, #f0f9ff 100%)',
        // ... more gradients
      }
    }
  }
}
```

### Framer Motion Integration
For complex animations, we use Framer Motion:

```tsx
import { motion } from 'framer-motion';

const TherapeuticComponent = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className="bg-gradient-therapeutic rounded-2xl p-6"
  >
    {/* Content */}
  </motion.div>
);
```

## 📊 Success Metrics

### User Experience
- **Reduced Anxiety**: Users report feeling calmer using the platform
- **Improved Engagement**: Higher completion rates for recovery activities
- **Better Accessibility**: Support for users with various needs

### Technical Performance
- **Smooth Animations**: 60fps animations on all devices
- **Fast Loading**: Optimized assets and efficient CSS
- **Responsive Design**: Works beautifully on all screen sizes

---

*This design system is continuously evolving based on user feedback and therapeutic best practices.*
