import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved =
        localStorage.getItem("krayasetu_theme") ||
        localStorage.getItem("app-theme") ||
        localStorage.getItem("block-planner-theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return "light";
  });

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem("krayasetu_theme", next);
      localStorage.setItem("app-theme", next);
      localStorage.setItem("block-planner-theme", next);
    } catch (e) {
      console.error("Failed to save theme in localStorage:", e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
