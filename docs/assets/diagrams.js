// Jekyll renders ```mermaid fences as highlighted code blocks; swap them for elements Mermaid
// can draw. On GitHub's own Markdown view the same fences render natively.
const diagrams = [];
for (const block of document.querySelectorAll(".language-mermaid")) {
  const diagram = document.createElement("div");
  diagram.className = "mermaid";
  diagram.textContent = block.textContent;
  block.replaceWith(diagram);
  diagrams.push({ el: diagram, source: block.textContent });
}

// Mermaid bakes the theme into the SVG, so a theme switch has to redraw from the source.
function renderDiagrams() {
  for (const { el, source } of diagrams) {
    el.removeAttribute("data-processed");
    el.textContent = source;
  }
  window.mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.dataset.theme === "dark" ? "dark" : "default",
    themeVariables: { fontFamily: "Figtree, system-ui, sans-serif" },
    securityLevel: "strict",
    flowchart: { htmlLabels: true, curve: "basis" },
  });
  window.mermaid.run({ nodes: diagrams.map((d) => d.el) });
}

renderDiagrams();
document.addEventListener("themechange", renderDiagrams);
