# Theme System Documentation

This document outlines the comprehensive theming system used across all Joli applications (client, organizer, and server components).

## Overview

The Joli project uses a unified theming system based on CSS custom properties (variables) and Tailwind CSS. This approach ensures:

- **Consistency**: All applications share the same design tokens
- **Maintainability**: Theme changes can be made in one place
- **Accessibility**: Built-in support for light/dark modes and high contrast
- **Flexibility**: Easy customization for different use cases

## Architecture

### CSS Variables Structure

All theme variables are defined in each application's `src/index.css` file using the following pattern:

```css
:root {
  /* Core colors */
  --background: #f8f7fa;
  --foreground: #3d3c4f;
  --card: #ffffff;
  --card-foreground: #3d3c4f;
  
  /* Interactive colors */
  --primary: #8a79ab;
  --primary-foreground: #f8f7fa;
  --secondary: #dfd9ec;
  --secondary-foreground: #3d3c4f;
  
  /* Semantic colors */
  --muted: #dcd9e3;
  --muted-foreground: #6b6880;
  --accent: #e6a5b8;
  --accent-foreground: #4b2e36;
  --destructive: #d95c5c;
  --destructive-foreground: #f8f7fa;
  
  /* Layout colors */
  --border: #cec9d9;
  --input: #eae7f0;
  --ring: #8a79ab;
  
  /* Shadows */
  --shadow-sm: 1px 2px 5px 1px hsl(0 0% 0% / 0.06), 1px 1px 2px 0px hsl(0 0% 0% / 0.06);
  --shadow-md: 1px 2px 5px 1px hsl(0 0% 0% / 0.06), 1px 2px 4px 0px hsl(0 0% 0% / 0.06);
  --shadow-lg: 1px 2px 5px 1px hsl(0 0% 0% / 0.06), 1px 4px 6px 0px hsl(0 0% 0% / 0.06);
  --shadow-xl: 1px 2px 5px 1px hsl(0 0% 0% / 0.06), 1px 8px 10px 0px hsl(0 0% 0% / 0.06);
}
```

### Application-Specific Themes

#### Client Application
- **Theme**: Light mode optimized
- **Primary Color**: Purple (#8a79ab)
- **Use Case**: Public-facing game interface
- **Characteristics**: Bright, welcoming, accessible

#### Organizer Application
- **Theme**: Dark mode optimized
- **Primary Color**: Light Purple (#b8a7d9)
- **Use Case**: Admin dashboard and game management
- **Characteristics**: Professional, reduced eye strain, data-focused

## Color System

### Color Categories

1. **Background Colors**
   - `--background`: Main page background
   - `--card`: Card/panel backgrounds
   - `--popover`: Overlay backgrounds

2. **Text Colors**
   - `--foreground`: Primary text
   - `--muted-foreground`: Secondary text
   - `--card-foreground`: Text on cards

3. **Interactive Colors**
   - `--primary`: Main brand color, buttons, links
   - `--secondary`: Secondary actions
   - `--accent`: Highlights, special elements
   - `--destructive`: Error states, delete actions

4. **Layout Colors**
   - `--border`: Borders, dividers
   - `--input`: Form input backgrounds
   - `--ring`: Focus rings, selection indicators

### Color Usage Guidelines

- **DO**: Use semantic color names (`--primary`, `--destructive`)
- **DON'T**: Use hardcoded color values (`#8a79ab`, `rgb(138, 121, 171)`)
- **DO**: Use Tailwind classes with theme variables (`bg-primary`, `text-foreground`)
- **DON'T**: Use hardcoded Tailwind colors (`bg-purple-500`, `text-gray-600`)

## Tailwind Integration

### Configuration

Both applications use identical Tailwind configurations that map CSS variables to Tailwind classes:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... other colors
      },
      boxShadow: {
        soft: "var(--shadow-sm)",
        medium: "var(--shadow-md)",
        hard: "var(--shadow-xl)",
      },
    },
  },
};
```

### Usage Examples

```jsx
// ✅ Correct - using theme-aware classes
<div className="bg-card border border-border text-foreground">
  <h2 className="text-primary">Title</h2>
  <p className="text-muted-foreground">Description</p>
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Action
  </button>
</div>

// ❌ Incorrect - hardcoded colors
<div className="bg-white border border-gray-200 text-gray-900">
  <h2 className="text-purple-600">Title</h2>
  <p className="text-gray-500">Description</p>
  <button className="bg-purple-600 text-white hover:bg-purple-700">
    Action
  </button>
</div>
```

## Component Patterns

### Cards
```jsx
<div className="bg-card border border-border rounded-lg p-6 shadow-soft">
  <h3 className="text-foreground font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Card content</p>
</div>
```

### Buttons
```jsx
// Primary button
<button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
  Primary Action
</button>

// Secondary button
<button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md">
  Secondary Action
</button>

// Destructive button
<button className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md">
  Delete
</button>
```

### Form Inputs
```jsx
<input 
  className="bg-input border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring px-3 py-2 rounded-md"
  placeholder="Enter text..."
/>
```

## Best Practices

### Development Guidelines

1. **Always use theme variables**: Never hardcode colors in components
2. **Test in both themes**: Ensure components work in light and dark modes
3. **Use semantic naming**: Choose color variables based on purpose, not appearance
4. **Maintain contrast ratios**: Ensure WCAG AA compliance for accessibility
5. **Document custom colors**: If adding new colors, update this documentation

### Code Review Checklist

- [ ] No hardcoded color values (`#hex`, `rgb()`, `rgba()`)
- [ ] No hardcoded Tailwind color classes (`bg-gray-100`, `text-blue-600`)
- [ ] Proper use of semantic color variables
- [ ] Consistent shadow usage (`shadow-soft`, `shadow-medium`, `shadow-hard`)
- [ ] Accessibility considerations (contrast, focus states)

## Maintenance

### Adding New Colors

1. Define the color in both `client/src/index.css` and `organizer/src/index.css`
2. Add the color to both `tailwind.config.js` files
3. Update this documentation
4. Test across all components

### Updating Existing Colors

1. Modify the CSS variable values in `index.css` files
2. Test visual impact across all applications
3. Ensure accessibility standards are maintained
4. Update documentation if semantic meaning changes

## Troubleshooting

### Common Issues

1. **Colors not updating**: Check if CSS variables are properly defined and Tailwind config is correct
2. **Inconsistent appearance**: Ensure both applications use the same variable names
3. **Build errors**: Verify Tailwind configuration syntax and CSS variable references

### Migration from Hardcoded Colors

1. Search for hardcoded color patterns: `bg-gray-`, `text-gray-`, `border-gray-`
2. Replace with semantic equivalents: `bg-muted`, `text-muted-foreground`, `border-border`
3. Test visual consistency
4. Update any custom CSS to use CSS variables

## Future Considerations

- **Theme switching**: Consider adding runtime theme switching capabilities
- **Brand customization**: Allow easy rebranding through CSS variable overrides
- **Component library**: Extract common themed components into a shared library
- **Design tokens**: Consider using design token tools for better design-development workflow

---

*Last updated: January 2025*
*Maintained by: Development Team*