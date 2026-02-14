import { visit } from "unist-util-visit";

export default function rehypeSidenotes() {
    return (tree) => {
        const notes = new Map();

        // Collect footnote content by id
        visit(tree, "element", (node) => {
            if (
                node.tagName === "li" &&
                node.properties?.id?.startsWith("user-content-fn-")
            ) {
                notes.set(node.properties.id, node.children);
            }
        });

        if (notes.size === 0) return;

        // Transform each <sup> reference into an inline sidenote
        let counter = 0;
        visit(tree, "element", (node, index, parent) => {
            if (node.tagName !== "sup") return;
            const a = node.children?.[0];
            if (!a || a.tagName !== "a") return;
            const href = a.properties?.href ?? "";
            if (!href.startsWith("#user-content-fn-")) return;

            const content = notes.get(href.slice(1));
            if (!content) return;
            counter++;

            // Strip the ↩ back-link from note content
            const stripped = content
                .flatMap((c) => c.children ?? [c])
                .filter(
                    (c) =>
                        !(
                            c.type === "element" &&
                            c.tagName === "a" &&
                            String(c.properties?.href ?? "").includes("fnref")
                        ),
                );

            const sidenote = {
                type: "element",
                tagName: "span",
                properties: { className: ["sidenote"] },
                children: [
                    {
                        type: "element",
                        tagName: "sup",
                        properties: {},
                        children: [{ type: "text", value: String(counter) }],
                    },
                    { type: "text", value: " " },
                    ...stripped,
                ],
            };

            node.properties = { className: ["sidenote-number"] };
            parent.children.splice(index + 1, 0, sidenote);
        });
    };
}
