import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Provider, GenerationParams } from "@/types";
import { getDefaultModel } from "@/types";

type KeyMode = "byok" | "managed";

interface SettingsState {
  userEmail: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  activeProvider: Provider;
  activeModel: string;
  generationParams: GenerationParams;
  theme: "light" | "dark";
  keyMode: KeyMode;

  setUserEmail: (email: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setActiveProvider: (provider: Provider) => void;
  setActiveModel: (model: string) => void;
  setGenerationParams: (params: Partial<GenerationParams>) => void;
  setTheme: (theme: "light" | "dark") => void;
  setKeyMode: (mode: KeyMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      userEmail: "",
      openaiApiKey: "",
      anthropicApiKey: "",
      activeProvider: "openai",
      activeModel: "gpt-4o",
      generationParams: {
        temperature: 1,
        maxTokens: 4096,
      },
      theme: "light",
      keyMode: "byok",

      setUserEmail: (email) => set({ userEmail: email }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
      setActiveProvider: (provider) =>
        set({ activeProvider: provider, activeModel: getDefaultModel(provider) }),
      setActiveModel: (model) => set({ activeModel: model }),
      setGenerationParams: (params) =>
        set((state) => ({
          generationParams: { ...state.generationParams, ...params },
        })),
      setTheme: (theme) => set({ theme }),
      setKeyMode: (mode) => set({ keyMode: mode }),
    }),
    { name: "branchgpt-settings" }
  )
);
