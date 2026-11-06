"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

const software = [
  "All software",
  "After Effects",
  "Blender",
  "Figma",
  "Photoshop",
] as const;

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
    guide: true,
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
    guide: true,
  },
  {
    name: "Biome Reader",
    publisher: "Geo-Scatter",
    software: "Blender",
    kind: "Scattering add-on",
    description: "Load biome presets and scatter plants across terrain.",
    platform: "Free hobbyist edition · Publisher form requires an email",
    compatibility:
      "For Blender 3.6, check the included build against Geo-Scatter’s version guide before installing.",
    url: "https://www.geoscatter.com/download.html",
  },
  {
    name: "Plant Library",
    publisher: "Geo-Scatter",
    software: "Blender",
    kind: "Biome assets",
    description:
      "Start a nature scene with the publisher’s free plant collection.",
    compatibility:
      "Works with Geo-Scatter or Biome Reader. Look for Plant Library on the publisher’s biome page.",
    url: "https://www.geoscatter.com/biomes.html",
  },
  {
    name: "Studio Small 06",
    publisher: "Poly Haven",
    software: "Blender",
    kind: "Studio HDRI",
    description:
      "Light products or metallic materials with bright spotlights and crisp reflections.",
    compatibility:
      "Load as a World Environment Texture in Blender 3.6. Try 1K first.",
    url: "https://polyhaven.com/a/studio_small_06",
  },
  {
    name: "Kloofendal Overcast",
    publisher: "Poly Haven",
    software: "Blender",
    kind: "Sky HDRI",
    description:
      "Give outdoor scenes soft, cool daylight with a sky-only environment.",
    compatibility: "Load as a World Environment Texture in Blender 3.6.",
    url: "https://polyhaven.com/a/kloofendal_overcast_puresky",
  },
  {
    name: "Rosendal Park Sunset",
    publisher: "Poly Haven",
    software: "Blender",
    kind: "Sky HDRI",
    description: "Use a warm horizon and cool blue sky for sunset lighting.",
    compatibility: "Load as a World Environment Texture in Blender 3.6.",
    url: "https://polyhaven.com/a/rosendal_park_sunset_puresky",
  },
  {
    name: "Poly Haven Textures",
    publisher: "Poly Haven",
    software: "Blender",
    kind: "PBR material library",
    description:
      "Find terrain, wood, stone, and other surfaces with maps for material setup.",
    compatibility:
      "Download individual maps for Blender 3.6. No library add-on required.",
    url: "https://polyhaven.com/textures",
  },
  {
    name: "Poly Haven Models",
    publisher: "Poly Haven",
    software: "Blender",
    kind: "3D model library",
    description:
      "Browse props, furniture, foliage, and more to dress your scenes.",
    compatibility:
      "Check available file formats and Blender compatibility on each asset page.",
    url: "https://polyhaven.com/models",
  },
  {
    name: "Iconify",
    publisher: "Iconify",
    software: "Figma",
    kind: "Icon plug-in",
    description:
      "Search multiple icon sets and insert editable SVGs into your designs.",
    compatibility:
      "Install through the Figma Community link on Iconify’s guide.",
    url: "https://iconify.design/docs/design/figma/",
  },
  {
    name: "Material 3 Design Kit",
    publisher: "Google",
    software: "Figma",
    kind: "UI kit",
    description: "Design interfaces using Material 3 components and styles.",
    compatibility: "Open the Community file in Figma Design.",
    url: "https://www.figma.com/community/file/1035203688168086460/material-3-design-kit",
  },
  {
    name: "Adobe Photoshop Brushes",
    publisher: "Adobe",
    software: "Photoshop",
    kind: "Brush packs",
    description:
      "Find free brush packs for sketching, painting, and adding texture.",
    compatibility:
      "Requires Photoshop desktop. In the Brushes panel, choose Get More Brushes.",
    url: "https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/brushes-presets/import-brushes-brush-packs.html",
    guide: true,
  },
  {
    name: "SuperPNG",
    publisher: "fnord",
    software: "Photoshop",
    kind: "PNG export plug-in",
    description: "Get more control over PNG compression and alpha channels.",
    compatibility:
      "Legacy plug-in. Verify compatibility with your Photoshop version and OS before installing.",
    url: "https://github.com/fnordware/SuperPNG",
  },
  {
    name: "Motion Bro",
    publisher: "Motion Bro",
    software: "After Effects",
    kind: "Preset manager",
    description: "Preview and apply motion presets from inside After Effects.",
    compatibility:
      "The plug-in is free. Individual preset packs can be free or paid.",
    url: "https://motionbro.com/plugin/",
    badge: "Free plug-in",
  },
  {
    name: "AEJuice Starter Pack",
    publisher: "AEJuice",
    software: "After Effects",
    kind: "Motion assets",
    description:
      "Browse the free starter collection for transitions, visual effects, and motion assets.",
    compatibility:
      "Pack Manager has Windows and macOS installers. Check the requirements for individual packs.",
    url: "https://aejuice.com/free-plugins/",
    badge: "Free collection",
  },
  {
    name: "DuIO",
    publisher: "RxLaboratorio",
    software: "After Effects",
    kind: "Import and export script",
    description:
      "Bring in Krita animations or Storyboarder boards, or export keyframe animation as JSON.",
    compatibility:
      "Publisher lists Windows and macOS. Check the release before installing on AE 2022.",
    url: "https://rxlaboratorio.org/rx-tool/duio/",
  },
  {
    name: "Font Awesome for Figma",
    publisher: "Font Awesome",
    software: "Figma",
    kind: "Icon plug-in",
    description: "Search and insert Font Awesome icons as SVGs.",
    compatibility:
      "A free Font Awesome account gives you access to the free icon set.",
    url: "https://docs.fontawesome.com/desktop/add-icons/figma-plugin/",
    badge: "Free tier",
    guide: true,
  },
  {
    name: "Simple Design System",
    publisher: "Figma",
    software: "Figma",
    kind: "UI kit",
    description:
      "Explore a starter design system with reusable components, styles, and variables.",
    compatibility: "Open the Community file in Figma Design.",
    url: "https://www.figma.com/community/file/1380235722331273046/simple-design-system",
  },
  {
    name: "Intel Texture Works",
    publisher: "Intel",
    software: "Photoshop",
    kind: "DDS plug-in",
    description: "Import and export compressed game textures in Photoshop.",
    compatibility:
      "Legacy Windows plug-in. Intel lists Photoshop CS6 and CC 2015. Check your version before installing.",
    url: "https://www.intel.com/content/www/us/en/developer/articles/tool/intel-texture-works-plugin.html",
  },
  {
    name: "All Access Brush Pass Sampler",
    publisher: "Tim Hankins Design",
    software: "Photoshop",
    kind: "Brush sampler",
    description:
      "Try the free brush sampler from the All Access Brush Pass plug-in.",
    compatibility:
      "Adobe Exchange lists Photoshop 2022 or later. The full brush library requires a paid license.",
    url: "https://exchange.adobe.com/apps/cc/948b549a?pluginId=948b549a&workflow=share",
    badge: "Free sampler",
  },
  {
    name: "Adobe Color Wheel",
    publisher: "Adobe",
    software: "Photoshop",
    kind: "Browser tool",
    description:
      "Build a palette with color harmony rules, then use the colors in your Photoshop project.",
    compatibility: "Runs in your browser. No Photoshop plug-in to install.",
    url: "https://color.adobe.com/create/color-wheel",
  },
  {
    name: "Images as Planes",
    publisher: "Blender Manual",
    software: "Blender",
    kind: "Bundled add-on",
    description:
      "Bring in an image as a textured plane, handy for logo references and scene backdrops.",
    compatibility:
      "Included in Blender 3.6. Enable it in Preferences → Add-ons.",
    url: "https://docs.blender.org/manual/id/3.6/addons/import_export/images_as_planes.html",
    guide: true,
  },
  {
    name: "Moonless Golf",
    publisher: "Poly Haven",
    software: "Blender",
    kind: "Night HDRI",
    description:
      "Add a starry night sky and a faint warm glow from distant lights.",
    compatibility: "Load as a World Environment Texture in Blender 3.6.",
    url: "https://polyhaven.com/a/moonless_golf",
  },
  {
    name: "Forest Slope",
    publisher: "Poly Haven",
    software: "Blender",
    kind: "Forest HDRI",
    description:
      "Light an outdoor scene with soft morning light filtered through pine trees.",
    compatibility: "Load as a World Environment Texture in Blender 3.6.",
    url: "https://polyhaven.com/a/forest_slope",
  },
  {
    name: "ambientCG",
    publisher: "ambientCG",
    software: "Blender",
    kind: "3D asset library",
    description:
      "Browse PBR materials, HDRIs, and models for terrain, buildings, and props.",
    compatibility:
      "Download individual texture maps for Blender 3.6. Check model formats on each asset page.",
    url: "https://ambientcg.com/",
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
              <span className="tag">{tool.badge || "Free"}</span>
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
              {tool.guide ? "Open official guide" : "Get from official source"}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
