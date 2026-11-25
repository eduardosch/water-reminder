// Jekyll renders ```mermaid fences as highlighted code blocks; swap them for elements Mermaid
// can draw. On GitHub's own Markdown view the same fences render natively.
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

for (const block of document.querySelectorAll(".language-mermaid")) {
  const diagram = document.createElement("div");
  diagram.className = "mermaid";
  diagram.textContent = block.textContent;
  block.replaceWith(diagram);
}

window.mermaid.initialize({
  startOnLoad: false,
  theme: darkQuery.matches ? "dark" : "default",
  securityLevel: "strict",
  flowchart: { htmlLabels: true, curve: "basis" },
});
window.mermaid.run({ querySelector: ".mermaid" });
