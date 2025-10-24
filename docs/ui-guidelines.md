# UI Style Guide - Spec BeanBot

**Version**: 1.0  
**Date**: October 24, 2025  
**Philosophy**: Clean, minimal design following constitutional principle VI

## Design Principles

### 1. Simplicity First
- Use Unicode characters instead of complex SVG icons where appropriate
- Minimize visual complexity - every element should have a purpose
- Prefer native HTML elements and proven CSS patterns
- No unnecessary animations or effects

### 2. Consistency
- Standardize spacing, colors, and typography across all pages
- Use consistent button patterns and form layouts
- Maintain uniform navigation patterns

### 3. Accessibility
- Ensure keyboard navigation works everywhere
- Provide clear focus indicators
- Use semantic HTML elements
- Maintain readable color contrast ratios

### 4. Performance
- All pages should load and become interactive within 2 seconds
- Minimize JavaScript where possible
- Use server-side rendering for initial content

## Color Palette

### Neutral Colors
```css
Background: bg-gray-50
Surface: bg-white
Border: border-gray-200
Text Primary: text-gray-900
Text Secondary: text-gray-700
Text Muted: text-gray-500
```

### Status Colors
```css
Pending: bg-yellow-100 text-yellow-800
Sent: bg-blue-100 text-blue-800
Acknowledged: bg-green-100 text-green-800
Declined/Failed: bg-red-100 text-red-800
Escalated: bg-purple-100 text-purple-800
```

### Accent Colors
```css
Primary Action: bg-blue-600 hover:bg-blue-700
Primary Text Link: text-blue-600 hover:underline
Success: bg-green-500
Warning: bg-yellow-500
Error: bg-red-500
```

## Typography

### Headings
```html
<!-- Page Title -->
<h1 class="text-3xl font-bold text-gray-900">Page Title</h1>

<!-- Section Title -->
<h2 class="text-xl font-bold text-gray-900 mb-2">Section Title</h2>

<!-- Subsection Title -->
<h3 class="text-lg font-bold text-gray-900 mb-2">Subsection</h3>
```

### Body Text
```html
<!-- Primary text -->
<p class="text-gray-700">Main content text</p>

<!-- Secondary/muted text -->
<p class="text-sm text-gray-500">Helper text or metadata</p>

<!-- Bold emphasis -->
<span class="font-bold text-gray-900">Important text</span>
```

## Components

### Buttons

#### Primary Action Button
```html
<button class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
  Action
</button>
```

#### Secondary Button
```html
<button class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
  Secondary Action
</button>
```

#### Danger Button
```html
<button class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
  Delete
</button>
```

#### Text Link Button
```html
<button class="text-blue-600 hover:underline text-sm font-medium">
  Link Action
</button>
```

### Form Elements

#### Text Input
```html
<input 
  type="text"
  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Enter text..."
/>
```

#### Select Dropdown
```html
<select class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

#### Textarea
```html
<textarea 
  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  rows="4"
></textarea>
```

#### Checkbox
```html
<input 
  type="checkbox"
  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
/>
```

#### Form Label
```html
<label class="block text-sm font-medium text-gray-700 mb-2">
  Field Label *
</label>
```

### Cards & Containers

#### Standard Card
```html
<div class="bg-white border border-gray-200 p-4 md:p-6">
  <!-- Content -->
</div>
```

#### Card with Accent Border
```html
<div class="bg-white border-l-4 border-blue-500 p-4">
  <!-- Highlighted content -->
</div>
```

### Alert Messages

#### Info Alert
```html
<div class="bg-white border-l-4 border-blue-500 p-4">
  <h2 class="text-xl font-bold text-gray-900 mb-2">ℹ️ Information</h2>
  <p class="text-gray-700">Message content here</p>
</div>
```

#### Warning Alert
```html
<div class="bg-white border-l-4 border-yellow-500 p-4">
  <h2 class="text-xl font-bold text-gray-900 mb-2">⚠️ Warning</h2>
  <p class="text-gray-700">Warning message here</p>
</div>
```

#### Error Alert
```html
<div class="bg-white border-l-4 border-red-500 p-4">
  <h2 class="text-xl font-bold text-gray-900 mb-2">⚠️ Error</h2>
  <p class="text-gray-700">Error message here</p>
</div>
```

#### Success Alert
```html
<div class="bg-white border-l-4 border-green-500 p-4">
  <h2 class="text-xl font-bold text-gray-900 mb-2">✅ Success</h2>
  <p class="text-gray-700">Success message here</p>
</div>
```

### Navigation Links

#### Primary Navigation Link
```html
<a href="/" class="text-blue-600 hover:underline">
  ← Back to Dashboard
</a>
```

#### Secondary Navigation
```html
<a href="/path" class="text-gray-600 hover:underline">
  Secondary Link
</a>
```

### Status Badges

```html
<!-- Pending -->
<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
  Pending
</span>

<!-- Sent -->
<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
  Sent
</span>

<!-- Success/Acknowledged -->
<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
  Acknowledged
</span>

<!-- Error/Declined -->
<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
  Declined
</span>
```

### Loading States

#### Spinner
```html
<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
```

#### Loading Text
```html
<p class="text-sm text-gray-500">Loading...</p>
```

## Layout Patterns

### Page Container
```html
<div class="min-h-screen bg-gray-50 p-4 md:p-8">
  <div class="max-w-4xl mx-auto">
    <!-- Page content -->
  </div>
</div>
```

### Dashboard Grid
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
  <!-- Grid items -->
</div>
```

### Two-Column Layout
```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <!-- Columns -->
</div>
```

### Responsive Spacing
```css
/* Padding */
p-4 md:p-6 lg:p-8

/* Margins */
mb-4 md:mb-6 lg:mb-8

/* Gaps */
gap-4 md:gap-6 lg:gap-8
```

## Unicode Icons

Use these Unicode characters instead of icon libraries:

```
Navigation:
← (U+2190) - Back/Previous
→ (U+2192) - Forward/Next
↑ (U+2191) - Up
↓ (U+2193) - Down

Status:
✅ (U+2705) - Success/Confirmed
❌ (U+274C) - Error/Declined
⚠️ (U+26A0) - Warning
ℹ️ (U+2139) - Information
⏳ (U+23F3) - Pending/Waiting

Actions:
+ (U+002B) - Add/Create
✏️ (U+270F) - Edit
🗑️ (U+1F5D1) - Delete
🔄 (U+1F504) - Refresh
⚙️ (U+2699) - Settings

Communication:
📤 (U+1F4E4) - Sent
📥 (U+1F4E5) - Received
💬 (U+1F4AC) - Message/Response
📊 (U+1F4CA) - Statistics
📝 (U+1F4DD) - Note/Edit
```

## Form Validation

### Error Display
```html
<!-- Field with error -->
<div>
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Field Name *
  </label>
  <input 
    type="text"
    class="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
  />
  <p class="mt-1 text-sm text-red-600">
    Error message here
  </p>
</div>
```

### Success Feedback
```html
<p class="text-sm text-green-600">
  ✅ Field validated successfully
</p>
```

## Spacing Scale

Follow Tailwind's spacing scale consistently:

```
xs: 0.5rem (2px)
sm: 0.75rem (3px)
base: 1rem (4px)
lg: 1.5rem (6px)
xl: 2rem (8px)

Common patterns:
- Tight spacing: gap-2 or space-y-2
- Normal spacing: gap-4 or space-y-4
- Loose spacing: gap-6 or space-y-6
```

## Responsive Design

### Breakpoints
```css
sm: 640px  - Small devices
md: 768px  - Tablets
lg: 1024px - Desktops
xl: 1280px - Large desktops
```

### Mobile-First Approach
- Design for mobile first
- Add md: and lg: prefixes for larger screens
- Test on actual devices when possible

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible on all focusable elements
- [ ] Color contrast ratio at least 4.5:1 for text
- [ ] Form inputs have associated labels
- [ ] Error messages clearly associated with fields
- [ ] Loading states announced to screen readers
- [ ] Buttons have descriptive text (not just icons)

## Performance Guidelines

### Page Load
- Initial render: < 1 second
- Interactive: < 2 seconds
- Full load: < 3 seconds

### Optimization Tips
- Minimize inline JavaScript
- Use Fresh Islands only when necessary
- Lazy load non-critical content
- Optimize images (compress, use appropriate formats)
- Minimize CSS (use Tailwind's purge)

## Testing Requirements

### Cross-Browser Testing
Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Device Testing
- Mobile phones (iOS and Android)
- Tablets
- Desktop browsers
- Different screen sizes

### Usability Testing
- Can users complete common tasks in < 3 clicks?
- Are error messages clear and actionable?
- Is the loading state clear for all async operations?
- Does the UI work without JavaScript (progressive enhancement)?

## Common Patterns

### Confirmation Dialog Pattern
```javascript
if (!confirm('Are you sure you want to delete this reminder?')) return;
```

### Success/Error Feedback Pattern
```javascript
try {
  await performAction();
  alert('✅ Action completed successfully!');
} catch (error) {
  alert(`⚠️ Error: ${error.message}`);
}
```

### Loading State Pattern
```javascript
const [isLoading, setIsLoading] = useState(false);

// In button:
disabled={isLoading}
{isLoading ? 'Loading...' : 'Submit'}
```

## Anti-Patterns (Avoid These)

❌ Complex custom SVG icons for simple actions  
✅ Use Unicode characters or simple CSS shapes

❌ Multiple shadow layers (shadow-lg, shadow-xl)  
✅ Use single shadow or border

❌ Rounded corners everywhere (rounded-full, rounded-2xl)  
✅ Use consistent rounded-md or no rounding

❌ Many different font weights  
✅ Use font-medium and font-bold consistently

❌ Custom color values  
✅ Use Tailwind's standard palette

❌ Animations on every interaction  
✅ Use animations sparingly, only where they add clarity

## Quick Reference

### Standard Page Structure
```html
<div class="min-h-screen bg-gray-50 p-4 md:p-8">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <a href="/" class="text-blue-600 hover:underline inline-block mb-4">
        ← Back to Dashboard
      </a>
      <h1 class="text-3xl font-bold text-gray-900">Page Title</h1>
    </div>

    <!-- Main Content Card -->
    <div class="bg-white border border-gray-200 p-4 md:p-6">
      <!-- Content here -->
    </div>

    <!-- Optional Info Section -->
    <div class="mt-6 bg-white border-l-4 border-blue-500 p-4">
      <h3 class="font-bold text-gray-900 mb-2">ℹ️ Additional Info</h3>
      <p class="text-sm text-gray-700">Helper text</p>
    </div>
  </div>
</div>
```

---

**Maintained by**: Spec BeanBot Development Team  
**Last Updated**: October 24, 2025  
**Document Version**: 1.0
