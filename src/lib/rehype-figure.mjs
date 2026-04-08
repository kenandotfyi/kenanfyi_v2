import { visit } from "unist-util-visit";

export default function rehypeFigure() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "img" || !parent) return;

      const alt = node.properties?.alt;
      if (!alt) return;

      const figure = {
        type: "element",
        tagName: "figure",
        properties: {},
        children: [
          node,
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: alt }],
          },
        ],
      };

      parent.children.splice(index, 1, figure);
    });
  };
}
