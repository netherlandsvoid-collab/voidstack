"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

const software = ["All software", "After Effects", "Blender"] as const;

const tools = [
  {
    name: "FX Console",
    publisher: "Video Copilot",
    software: "After Effects",
    kind: "Workflow plug-in",
    description: "Find and apply effects or presets from a keyboard shortcut.",
    platform: "Windows and macOS installers",
    compatibility:
      "AE 2022 compatibility is not confirmed by the linked release page.",
    url: "https://www.videocopilot.net/blog/2018/05/fx-console-updated-to-v1-0-3/",
  },
  {
    name: "Saber",
    publisher: "Video Copilot",
    software: "After Effects",
    kind: "Effects plug-in",
    description:
      "Build glowing outlines, neon text, and energy beams from masks or text layers.",
    platform: "Windows and macOS installers",
    compatibility:
      "AE 2022 compatibility is not confirmed by the linked release page.",
    url: "https://www.videocopilot.net/blog/2016/03/new-plug-in-saber-now-available-100-free/",
  },
  {
    name: "Duik Ángela",
    publisher: "RxLaboratorio",
    software: "After Effects",
    kind: "Rigging toolkit",
    description:
      "Rig 2D characters with bones, controllers, and inverse kinematics.",
    platform: "Windows and macOS",
    compatibility: "Publisher lists AE 2021 and later, including AE 2022.",
    url: "https://rxlaboratorio.org/rx-tool/duik/",
  },
  {
    name: "Node Wrangler",
    publisher: "Blender Manual",
    software: "Blender",
    kind: "Bundled add-on",
    description:
      "Speed up node editing and connect texture maps to your material.",
    compatibility:
      "Included in Blender 3.6. Enable it in Preferences → Add-ons.",
    url: "https://docs.blender.org/manual/en/3.6/addons/node/node_wrangler.html",
    bundled: true,
  },
  {
    name: "LoopTools",
    publisher: "Blender Manual",
    software: "Blender",
    kind: "Bundled add-on",
    description:
      "Shape and clean up mesh loops with Bridge, Circle, Relax, and Space.",
    compatibility:
      "Included in Blender 3.6. Enable Mesh: LoopTools in Preferences → Add-ons.",
    url: "https://docs.blender.org/manual/en/3.6/addons/mesh/looptools.html",
    bundled: true,
  },
];

export default function CuratedTools() {
  const [selected, setSelected] =
    useState<(typeof software)[number]>("All software");
  const visible = tools.filter(
    (tool) => selected === "All software" || tool.software === selected,
  );

  return (
    <section className="curated-tools" aria-label="Curated tools">
      <div className="market-filters">
        <div
          className="category-row"
          role="group"
          aria-label="Filter by software"
        >
          {software.map((option) => (
            <button
              key={option}
              type="button"
              className={selected === option ? "selected" : ""}
              aria-pressed={selected === option}
              onClick={() => setSelected(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="product-grid">
        {visible.map((tool) => (
          <article className="product-card curated-tool" key={tool.name}>
            <div className="curated-tool-meta">
              <span className="eyebrow">{tool.software}</span>
              <span className="tag">Free</span>
            </div>
            <div>
              <h2>{tool.name}</h2>
              <p className="fine-print">
                {tool.kind} · {tool.publisher}
              </p>
            </div>
            <p>{tool.description}</p>
            <div className="curated-tool-compatibility fine-print">
              {tool.platform && <p>{tool.platform}</p>}
              <p>{tool.compatibility}</p>
            </div>
            <a
              className="button secondary"
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tool.bundled
                ? "Open official guide"
                : "Get from official source"}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
