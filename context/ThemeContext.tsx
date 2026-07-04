import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: (isDark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      setIsDarkMode(isDark);
      document.body.classList.toggle('dark-mode', isDark);
      return;
    }

    // Otherwise, auto-detect theme based on time
    const setAutoTheme = async () => {
      try {
        const res = await fetch('http://ip-api.com/json/?fields=timezone');
        const data = await res.json();

        const userTime = new Date(new Date().toLocaleString('en-US', {
          timeZone: data.timezone,
        }));
        const hour = userTime.getHours();
        const isDark = hour < 6 || hour >= 18; // Dark: 6PM to 6AM
        
        setIsDarkMode(isDark);
        document.body.classList.toggle('dark-mode', isDark);
      } catch (e) {
        // Fallback: system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
        document.body.classList.toggle('dark-mode', prefersDark);
      }
    };

    setAutoTheme();
  }, []);

  const toggleTheme = (isDark: boolean) => {
    setIsDarkMode(isDark);
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Also trigger custom event if any vanilla JS scripts need to know (like sliders)
    window.dispatchEvent(new Event('themeChanged'));
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
