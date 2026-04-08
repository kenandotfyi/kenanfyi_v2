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

        const footnoteItems = [];

        // Transform each footnote reference into an inline sidenote
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

            const noteId = `note-${counter}`;
            const refId = `note-ref-${counter}`;

            // Inline sidenote for desktop
            const sidenote = {
                type: "element",
                tagName: "span",
                properties: { className: ["sidenote"] },
                children: [
                    {
                        type: "element",
                        tagName: "label",
                        properties: { className: ["sidenote-inner-number"] },
                        children: [{ type: "text", value: String(counter) }],
                    },
                    { type: "text", value: " " },
                    ...stripped,
                ],
            };

            // The clickable number in the text
            node.tagName = "label";
            node.properties = { className: ["sidenote-number"], id: refId };
            node.children = [
                {
                    type: "element",
                    tagName: "a",
                    properties: { href: `#${noteId}` },
                    children: [{ type: "text", value: String(counter) }],
                },
            ];
            parent.children.splice(index + 1, 0, sidenote);

            // Collect footnote item for the footer
            footnoteItems.push({
                type: "element",
                tagName: "li",
                properties: { id: noteId },
                children: [
                    ...stripped.map((n) => structuredClone(n)),
                    { type: "text", value: " " },
                    {
                        type: "element",
                        tagName: "a",
                        properties: {
                            href: `#${refId}`,
                            className: ["footnote-backref"],
                        },
                        children: [{ type: "text", value: "↩" }],
                    },
                ],
            });
        });

        // Remove the original [data-footnotes] section
        visit(tree, "element", (node, index, parent) => {
            if (node.properties?.dataFootnotes != null && parent) {
                parent.children.splice(index, 1);
                return index; // revisit this index since we removed a node
            }
        });

        // Append a footnotes footer to the tree
        const footer = {
            type: "element",
            tagName: "footer",
            properties: { className: ["mobile-footnotes"] },
            children: [
                {
                    type: "element",
                    tagName: "ol",
                    properties: {},
                    children: footnoteItems,
                },
            ],
        };

        tree.children.push(footer);
    };
}
