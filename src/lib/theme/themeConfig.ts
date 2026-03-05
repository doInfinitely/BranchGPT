import type { Provider } from "@/types";

export type ThemeVariant = "openai-light" | "openai-dark" | "anthropic-light" | "anthropic-dark";

interface ThemePalette {
  "--color-bg": string;
  "--color-bg-secondary": string;
  "--color-bg-tertiary": string;
  "--color-text": string;
  "--color-text-secondary": string;
  "--color-text-tertiary": string;
  "--color-accent": string;
  "--color-accent-hover": string;
  "--color-accent-light": string;
  "--color-border": string;
  "--color-border-light": string;
  "--color-node-user": string;
  "--color-node-assistant": string;
  "--color-node-user-text": string;
  "--color-node-assistant-text": string;
  "--color-edge": string;
  "--color-sidebar": string;
  "--color-compose": string;
  "--color-error": string;
  "--color-streaming": string;
}

const palettes: Record<ThemeVariant, ThemePalette> = {
  "openai-light": {
    "--color-bg": "#ffffff",
    "--color-bg-secondary": "#f7f7f8",
    "--color-bg-tertiary": "#ececf1",
    "--color-text": "#1a1a2e",
    "--color-text-secondary": "#6e6e80",
    "--color-text-tertiary": "#8e8ea0",
    "--color-accent": "#10a37f",
    "--color-accent-hover": "#0d8a6b",
    "--color-accent-light": "#e6f7f2",
    "--color-border": "#d9d9e3",
    "--color-border-light": "#ececf1",
    "--color-node-user": "#e6f7f2",
    "--color-node-assistant": "#f7f7f8",
    "--color-node-user-text": "#1a1a2e",
    "--color-node-assistant-text": "#1a1a2e",
    "--color-edge": "#d9d9e3",
    "--color-sidebar": "#f7f7f8",
    "--color-compose": "#ffffff",
    "--color-error": "#ef4444",
    "--color-streaming": "#10a37f",
  },
  "openai-dark": {
    "--color-bg": "#1a1a2e",
    "--color-bg-secondary": "#2a2a3e",
    "--color-bg-tertiary": "#3a3a4e",
    "--color-text": "#ececf1",
    "--color-text-secondary": "#8e8ea0",
    "--color-text-tertiary": "#6e6e80",
    "--color-accent": "#10a37f",
    "--color-accent-hover": "#14bf93",
    "--color-accent-light": "#1a3a30",
    "--color-border": "#3a3a4e",
    "--color-border-light": "#2a2a3e",
    "--color-node-user": "#1a3a30",
    "--color-node-assistant": "#2a2a3e",
    "--color-node-user-text": "#ececf1",
    "--color-node-assistant-text": "#ececf1",
    "--color-edge": "#3a3a4e",
    "--color-sidebar": "#16162a",
    "--color-compose": "#2a2a3e",
    "--color-error": "#ef4444",
    "--color-streaming": "#10a37f",
  },
  "anthropic-light": {
    "--color-bg": "#ffffff",
    "--color-bg-secondary": "#faf6f1",
    "--color-bg-tertiary": "#f0e8df",
    "--color-text": "#2d2017",
    "--color-text-secondary": "#7a6b5d",
    "--color-text-tertiary": "#9a8b7d",
    "--color-accent": "#c96442",
    "--color-accent-hover": "#b55638",
    "--color-accent-light": "#fdf0eb",
    "--color-border": "#e0d5c9",
    "--color-border-light": "#f0e8df",
    "--color-node-user": "#fdf0eb",
    "--color-node-assistant": "#faf6f1",
    "--color-node-user-text": "#2d2017",
    "--color-node-assistant-text": "#2d2017",
    "--color-edge": "#e0d5c9",
    "--color-sidebar": "#faf6f1",
    "--color-compose": "#ffffff",
    "--color-error": "#ef4444",
    "--color-streaming": "#c96442",
  },
  "anthropic-dark": {
    "--color-bg": "#1c1510",
    "--color-bg-secondary": "#2c2219",
    "--color-bg-tertiary": "#3c3229",
    "--color-text": "#f0e8df",
    "--color-text-secondary": "#9a8b7d",
    "--color-text-tertiary": "#7a6b5d",
    "--color-accent": "#d97a58",
    "--color-accent-hover": "#e68a66",
    "--color-accent-light": "#3c2a1f",
    "--color-border": "#3c3229",
    "--color-border-light": "#2c2219",
    "--color-node-user": "#3c2a1f",
    "--color-node-assistant": "#2c2219",
    "--color-node-user-text": "#f0e8df",
    "--color-node-assistant-text": "#f0e8df",
    "--color-edge": "#3c3229",
    "--color-sidebar": "#161110",
    "--color-compose": "#2c2219",
    "--color-error": "#ef4444",
    "--color-streaming": "#d97a58",
  },
};

export function getThemeVariant(provider: Provider, theme: "light" | "dark"): ThemeVariant {
  return `${provider}-${theme}` as ThemeVariant;
}

export function getThemePalette(variant: ThemeVariant): ThemePalette {
  return palettes[variant];
}

export function applyTheme(provider: Provider, theme: "light" | "dark"): void {
  const variant = getThemeVariant(provider, theme);
  const palette = getThemePalette(variant);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-provider", provider);
}
