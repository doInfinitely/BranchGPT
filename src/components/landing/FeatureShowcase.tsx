"use client";

import { useState } from "react";

interface Feature {
  title: string;
  description: string;
  videoPath: string;
  videoAlt: string;
}

const features: Feature[] = [
  {
    title: "Branching conversations",
    description:
      "Click branch on any message to fork the conversation. Explore alternative responses, compare approaches, and never lose a thought.",
    videoPath: "/features/branching.mp4",
    videoAlt: "Branching a conversation into two paths",
  },
  {
    title: "Multi-select context",
    description:
      "Cmd+click multiple nodes to select them as context. A visual contour groups your selection, and you can send a message informed by all of them.",
    videoPath: "/features/multi-select.mp4",
    videoAlt: "Selecting multiple nodes as context",
  },
  {
    title: "Visual tree layout",
    description:
      "See your entire conversation as an interactive tree. Zoom, pan, and navigate branches visually as your discussion grows.",
    videoPath: "/features/tree-layout.mp4",
    videoAlt: "Visual tree growing with conversation",
  },
  {
    title: "Multi-provider support",
    description:
      "Switch between OpenAI and Anthropic models mid-conversation. Compare GPT-4o and Claude side-by-side on the same prompt.",
    videoPath: "/features/multi-provider.mp4",
    videoAlt: "Switching between GPT-4o and Claude",
  },
  {
    title: "Collapsible nodes",
    description:
      "Collapse long messages to keep your tree tidy. Expand them anytime to see the full content.",
    videoPath: "/features/collapse.mp4",
    videoAlt: "Collapsing and expanding nodes",
  },
  {
    title: "Hidden nodes panel",
    description:
      "Hide branches you don't need right now. Peek at hidden nodes with a hover preview and restore them instantly.",
    videoPath: "/features/hide-restore.mp4",
    videoAlt: "Hiding and restoring nodes",
  },
];

function FeatureVideo({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="text-gray-400 text-sm text-center p-8">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mx-auto mb-2 opacity-40"
        >
          <polygon points="5,3 19,12 5,21" />
        </svg>
        {alt}
      </div>
    );
  }

  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function FeatureShowcase() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
          Everything you need to explore ideas
        </h2>
        <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto mb-16">
          BranchGPT gives you superpowers for AI conversations with a visual, branching interface.
        </p>

        <div className="space-y-24">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`flex flex-col ${
                i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center gap-12`}
            >
              {/* Video / fallback placeholder */}
              <div className="flex-1 w-full">
                <div className="rounded-xl border border-gray-200 bg-gray-100 shadow-lg overflow-hidden aspect-video flex items-center justify-center">
                  <FeatureVideo src={feature.videoPath} alt={feature.videoAlt} />
                </div>
              </div>

              {/* Text */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
