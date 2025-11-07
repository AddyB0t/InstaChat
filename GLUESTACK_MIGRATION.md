# GlueStack UI Migration Guide

## Overview
This document outlines the migration of InstaChat from custom styled components to GlueStack UI for a minimalist design approach.

## What is GlueStack UI?
GlueStack UI is a minimalist, accessible component library for React Native that provides:
- Pre-built, theme-aware components
- Built-in dark/light mode support
- Simplified styling with utility-based approach
- Consistent design system across the app

## Installation & Setup

### 1. Installed Packages
```bash
npm install @gluestack-ui/themed @gluestack-ui/config --legacy-peer-deps
```

### 2. Created Files

#### Configuration
- `config/gluestack-ui.config.ts` - GlueStack theme configuration with light/dark color schemes

#### Context
- `context/GlueStackThemeContext.tsx` - React context for managing GlueStack theme state (light/dark)

#### Components (Custom GlueStack Wrappers)
- `components/GlueStackBox.tsx` - Wrapper for View with utility-based styling (padding, margin, flexbox, border, etc.)
- `components/GlueStackText.tsx` - Wrapper for Text with size, weight, and color props
- `components/GlueStackButton.tsx` - Wrapper for TouchableOpacity with variant (primary, secondary, outline, ghost) and size options (sm, md, lg)
- `components/gluestack/index.ts` - Export file for easy component imports

#### Screens Migrated
- `screens/SettingsScreenGlueStack.tsx` - Converted from custom styled components to GlueStack

### 3. Updated App Structure
- `App.tsx` - Added GlueStackThemeProvider wrapper
- `navigation/RootNavigator.tsx` - Updated to use SettingsScreenGlueStack

## GlueStack Components Reference

### GlueStackBox
A flexible container component with utility props:

```typescript
<GlueStackBox
  p={16}              // padding
  px={12}             // paddingHorizontal
  py={8}              // paddingVertical
  m={16}              // margin
  mx={8}              // marginHorizontal
  my={8}              // marginVertical
  bg="primary"        // background (primary, surface, background, success, error, warning, info)
  rounded="md"        // borderRadius (sm, md, lg, full)
  flexDirection="row" // row, column
  alignItems="center" // flex alignment
  justifyContent="space-between"
  gap={8}             // gap between children
  flex={1}
>
  {/* children */}
</GlueStackBox>
```

### GlueStackText
A text component with semantic styling:

```typescript
<GlueStackText
  size="base"         // xs, sm, base, lg, xl, 2xl
  weight="600"        // 400, 500, 600, 700, 800
  color="text"        // primary, text, textSecondary, success, error, warning, info
  numberOfLines={2}
>
  Label
</GlueStackText>
```

### GlueStackButton
An accessible button component:

```typescript
<GlueStackButton
  onPress={() => handlePress()}
  label="Click me"
  variant="primary"   // primary, secondary, outline, ghost
  size="md"           // sm, md, lg
  disabled={false}
/>
```

## Color Scheme

### Light Mode
- Primary: #0284c7 (Sky Blue)
- Background: #ffffff
- Surface: #f1f5f9
- Text: #0f172a
- TextSecondary: #64748b

### Dark Mode
- Primary: #0ea5e9 (Bright Sky Blue)
- Background: #0f172a (Almost Black)
- Surface: #1e293b (Dark Gray)
- Text: #f1f5f9 (Off White)
- TextSecondary: #94a3b8 (Medium Gray)

## Migration Steps

### Completed
✅ Setup GlueStack infrastructure
✅ Create GlueStack components (Box, Text, Button)
✅ Migrate SettingsScreen to GlueStack
✅ Integrate GlueStack theme context with existing ThemeContext
✅ Build and test GlueStack SettingsScreen

### In Progress
⏳ Migrate BrowseScreen to GlueStack
⏳ Migrate SwipeLibraryScreen to GlueStack
⏳ Migrate HomeScreen to GlueStack
⏳ Migrate ArticleDetailScreen to GlueStack

### Next Steps
1. Convert remaining screens to use GlueStack components
2. Remove old StyleSheet definitions from migrated screens
3. Add more GlueStack component wrappers as needed (Card, Input, etc.)
4. Test light/dark theme switching
5. Optimize bundle size by removing unused custom styles

## Theme Usage

### Using the GlueStack Theme
```typescript
import { useGlueStackTheme } from '../context/GlueStackThemeContext';

const MyComponent = () => {
  const { theme, toggleTheme, setTheme } = useGlueStackTheme();

  return (
    <GlueStackBox bg="background">
      <GlueStackText color="text">
        Current theme: {theme}
      </GlueStackText>
    </GlueStackBox>
  );
};
```

### Combining with Existing ThemeContext
The app maintains both `ThemeContext` (for existing custom logic) and `GlueStackThemeContext` (for GlueStack theme state). They work together seamlessly.

## Benefits of GlueStack Migration

1. **Minimalist Design**: Cleaner, more readable component syntax
2. **Consistency**: Built-in design system prevents style inconsistencies
3. **Accessibility**: GlueStack components have accessibility best practices built-in
4. **Maintainability**: Less custom styling code to maintain
5. **Theme Support**: Native dark/light mode switching
6. **Performance**: Optimized component rendering

## Files Structure

```
InstaChat/
├── config/
│   └── gluestack-ui.config.ts
├── context/
│   ├── ThemeContext.tsx (existing)
│   └── GlueStackThemeContext.tsx (new)
├── components/
│   ├── GlueStackBox.tsx
│   ├── GlueStackText.tsx
│   ├── GlueStackButton.tsx
│   └── gluestack/
│       └── index.ts
└── screens/
    ├── SettingsScreenGlueStack.tsx (migrated)
    ├── SettingsScreen.tsx (old, can be removed after testing)
    └── ... (other screens to be migrated)
```

## Testing Checklist

- [ ] SettingsScreen GlueStack version displays correctly
- [ ] Light/Dark theme switching works
- [ ] Font size options functional
- [ ] Font family selection works
- [ ] All buttons are clickable and responsive
- [ ] Text inputs work properly
- [ ] Color contrast meets accessibility standards
- [ ] No console errors or warnings

## Support

For questions about component props and styling, refer to the individual component files:
- `components/GlueStackBox.tsx`
- `components/GlueStackText.tsx`
- `components/GlueStackButton.tsx`
