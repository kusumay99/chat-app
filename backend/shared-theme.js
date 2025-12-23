// Neutral Happiness Studio Theme Configuration
export const theme = {
  colors: {
    // Background colors
    background: '#F9FAFB',
    cardBackground: '#EDEDED',
    
    // Accent colors
    primary: '#A5B4FC',      // Soft purple
    success: '#86EFAC',      // Soft green
    accent: '#FBCFE8',       // Soft pink
    
    // Message bubbles
    sentBubble: '#E0E7FF',   // Pastel tint
    receivedBubble: '#FFFFFF',
    
    // Text colors
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    
    // Status colors
    online: '#10B981',
    offline: '#6B7280',
    away: '#F59E0B',
    
    // UI elements
    border: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)'
  },
  
  typography: {
    fontFamily: {
      primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      ios: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px'
  },
  
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  
  animations: {
    slideIn: {
      duration: '0.3s',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    fadeIn: {
      duration: '0.2s',
      easing: 'ease-in-out'
    }
  }
};

// CSS Variables for web
export const cssVariables = `
  :root {
    --color-background: ${theme.colors.background};
    --color-card-background: ${theme.colors.cardBackground};
    --color-primary: ${theme.colors.primary};
    --color-success: ${theme.colors.success};
    --color-accent: ${theme.colors.accent};
    --color-sent-bubble: ${theme.colors.sentBubble};
    --color-received-bubble: ${theme.colors.receivedBubble};
    --color-text-primary: ${theme.colors.textPrimary};
    --color-text-secondary: ${theme.colors.textSecondary};
    --color-text-muted: ${theme.colors.textMuted};
    --color-online: ${theme.colors.online};
    --color-offline: ${theme.colors.offline};
    --color-away: ${theme.colors.away};
    --color-border: ${theme.colors.border};
    --font-family-primary: ${theme.typography.fontFamily.primary};
    --spacing-xs: ${theme.spacing.xs};
    --spacing-sm: ${theme.spacing.sm};
    --spacing-md: ${theme.spacing.md};
    --spacing-lg: ${theme.spacing.lg};
    --spacing-xl: ${theme.spacing.xl};
    --border-radius-sm: ${theme.borderRadius.sm};
    --border-radius-md: ${theme.borderRadius.md};
    --border-radius-lg: ${theme.borderRadius.lg};
    --border-radius-xl: ${theme.borderRadius.xl};
    --shadow-sm: ${theme.shadows.sm};
    --shadow-md: ${theme.shadows.md};
    --shadow-lg: ${theme.shadows.lg};
  }
`;

export default theme;
