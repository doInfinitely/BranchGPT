"use client";

import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { useConversationStore } from "@/stores/conversationStore";
import { Modal, Input, Button } from "@/components/ui";
import { getModelsForProvider } from "@/types";
import type { Provider } from "@/types";
import { conversationRepo } from "@/lib/db";

export function SettingsModal() {
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);

  const userEmail = useSettingsStore((s) => s.userEmail);
  const setUserEmail = useSettingsStore((s) => s.setUserEmail);
  const openaiKey = useSettingsStore((s) => s.openaiApiKey);
  const anthropicKey = useSettingsStore((s) => s.anthropicApiKey);
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const activeModel = useSettingsStore((s) => s.activeModel);
  const generationParams = useSettingsStore((s) => s.generationParams);
  const theme = useSettingsStore((s) => s.theme);

  const setOpenaiKey = useSettingsStore((s) => s.setOpenaiApiKey);
  const setAnthropicKey = useSettingsStore((s) => s.setAnthropicApiKey);
  const setActiveProvider = useSettingsStore((s) => s.setActiveProvider);
  const setActiveModel = useSettingsStore((s) => s.setActiveModel);
  const setGenerationParams = useSettingsStore((s) => s.setGenerationParams);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const conversations = useConversationStore((s) => s.conversations);
  const nodes = useConversationStore((s) => s.nodes);
  const loadConversations = useConversationStore((s) => s.loadConversations);

  const models = getModelsForProvider(activeProvider);

  const handleExport = () => {
    const data = {
      conversations: Object.values(conversations),
      nodes: Object.values(nodes),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branchgpt-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.conversations && data.nodes) {
          for (const conv of data.conversations) {
            await conversationRepo.saveConversation(conv);
          }
          await conversationRepo.saveNodes(data.nodes);
          await loadConversations();
          alert("Import successful!");
        }
      } catch {
        alert("Invalid export file.");
      }
    };
    input.click();
  };

  return (
    <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
      <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Email identity */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Your Email
          </h3>
          <Input
            label=""
            type="email"
            placeholder="you@example.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            Optional. Saved locally to identify your chats for export/import.
          </p>
        </section>

        {/* API Keys */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            API Keys
          </h3>
          <div className="flex flex-col gap-3">
            <Input
              label="OpenAI API Key"
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            <Input
              label="Anthropic API Key"
              type="password"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>
        </section>

        {/* Provider & Model */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Model
          </h3>
          <div className="flex gap-2 mb-3">
            {(["openai", "anthropic"] as Provider[]).map((p) => (
              <Button
                key={p}
                variant={activeProvider === p ? "primary" : "secondary"}
                size="sm"
                onClick={() => setActiveProvider(p)}
              >
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </Button>
            ))}
          </div>
          <select
            value={activeModel}
            onChange={(e) => setActiveModel(e.target.value)}
            className="w-full h-9 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </section>

        {/* Generation Params — all options */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Parameters
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <SliderParam
              label="Temperature"
              value={generationParams.temperature ?? 1}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => setGenerationParams({ temperature: v })}
            />
            <SliderParam
              label="Max Tokens"
              value={generationParams.maxTokens ?? 4096}
              min={256}
              max={16384}
              step={256}
              onChange={(v) => setGenerationParams({ maxTokens: v })}
            />
            <SliderParam
              label="Top P"
              value={generationParams.topP ?? 1}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setGenerationParams({ topP: v })}
            />
            {activeProvider === "anthropic" && (
              <SliderParam
                label="Top K"
                value={generationParams.topK ?? 0}
                min={0}
                max={500}
                step={1}
                onChange={(v) => setGenerationParams({ topK: v })}
              />
            )}
            {activeProvider === "openai" && (
              <>
                <SliderParam
                  label="Freq. Penalty"
                  value={generationParams.frequencyPenalty ?? 0}
                  min={-2}
                  max={2}
                  step={0.1}
                  onChange={(v) => setGenerationParams({ frequencyPenalty: v })}
                />
                <SliderParam
                  label="Pres. Penalty"
                  value={generationParams.presencePenalty ?? 0}
                  min={-2}
                  max={2}
                  step={0.1}
                  onChange={(v) => setGenerationParams({ presencePenalty: v })}
                />
              </>
            )}
          </div>
          <div className="mt-3">
            <Input
              label="System Prompt"
              placeholder="You are a helpful assistant..."
              value={generationParams.systemPrompt ?? ""}
              onChange={(e) =>
                setGenerationParams({ systemPrompt: e.target.value })
              }
            />
          </div>
        </section>

        {/* Theme */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Theme
          </h3>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              Dark
            </Button>
          </div>
        </section>

        {/* Export / Import */}
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            Data
          </h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              Export All
            </Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>
              Import
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function SliderParam({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
        {label}: {Number.isInteger(value) ? value : value.toFixed(2)}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </div>
  );
}
