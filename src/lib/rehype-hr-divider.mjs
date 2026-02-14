import { visit } from "unist-util-visit";

export default function rehypeHrDivider() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "hr" || !parent) return;

      const svgNode = {
        type: "element",
        tagName: "svg",
        properties: {
          xmlns: "http://www.w3.org/2000/svg",
          width: "48",
          height: "48",
          viewBox: "0 0 256 256",
          "aria-hidden": "true",
        },
        children: [
          {
            type: "element",
            tagName: "path",
            properties: {
              fill: "currentColor",
              d: "M72 92a12 12 0 1 1-12-12a12 12 0 0 1 12 12m56-12a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 24a12 12 0 1 0-12-12a12 12 0 0 0 12 12M60 152a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12",
            },
            children: [],
          },
        ],
      };

      const divider = {
        type: "element",
        tagName: "div",
        properties: { className: ["post-divider"] },
        children: [svgNode],
      };

      parent.children.splice(index, 1, divider);
    });
  };
}
