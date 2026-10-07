import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Wraps the app with next-themes for Light / Dark / System theme support.
// The theme class is applied to <html> so Tailwind's dark: variant works.
// An inline script in index.html prevents flash of the wrong theme on load.
export default function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}