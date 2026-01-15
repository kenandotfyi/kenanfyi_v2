<script>
    import { onMount } from "svelte";

    let panels = [];
    let maxZIndex = 100;
    const STACK_OFFSET = 32;
    let isEnabled = true;
    const MOBILE_BREAKPOINT = 1140;
    const STORAGE_KEY = "stacked-panels-state";

    onMount(() => {
        checkScreenSize();

        if (isEnabled) {
            restorePanelsFromStorage();
        }

        window.addEventListener("resize", checkScreenSize);

        if (isEnabled) {
            document.addEventListener("click", handleLinkClick);
        }

        window.addEventListener("beforeunload", savePanelsToStorage);

        return () => {
            window.removeEventListener("resize", checkScreenSize);
            window.removeEventListener("click", handleLinkClick);
            window.removeEventListener("beforeunload", savePanelsToStorage);
        };
    });

    function checkScreenSize() {
        const wasEnabled = isEnabled;
        isEnabled = window.innerWidth >= MOBILE_BREAKPOINT;

        // if (wasEnabled && !isEnabled) {
        //     panels = [];
        // }

        if (!wasEnabled && isEnabled) {
            document.addEventListener("click", handleLinkClick);
        } else if (wasEnabled && !isEnabled) {
            document.removeEventListener("click", handleLinkClick);
        }
    }

    function savePanelsToStorage() {
        if (!isEnabled) return;

        try {
            const panelState = {
                panels: panels.map((p) => ({
                    id: p.id,
                    url: p.url,
                    pubDate: p.pubDate,
                    title: p.title,
                    content: p.content,
                    zIndex: p.zIndex,
                })),
                maxZIndex,
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(panelState));
        } catch (error) {
            console.error("Failed to save panels to storage:", error);
        }
    }

    function restorePanelsFromStorage() {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);

            if (stored) {
                const panelState = JSON.parse(stored);

                const currentPath = window.location.pathname;
                const filteredPanels = (panelState.panels || []).filter(
                    (p) => p.url !== currentPath,
                );

                panels = [...filteredPanels];
                maxZIndex = panelState.maxZIndex || 100;
            }
        } catch (error) {
            console.error("Failed to restore panels from storage:", error);
        }
    }

    function handleLinkClick(e) {
        if (!isEnabled) return;

        const link = e.target.closest("a");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href) return;

        if (href.startsWith("#")) {
            return;
        }

        const resolvedUrl = new URL(href, window.location.href);
        const pathname = resolvedUrl.pathname;

        if (resolvedUrl.hash && pathname === window.location.pathname) {
            return;
        }

        if (
            link.closest("nav") ||
            link.closest("header") ||
            link.closest('[role="navigation"]')
        ) {
            return;
        }

        if (
            pathname === "/thoughts" ||
            pathname === "/thoughts/" ||
            pathname === "/bits" ||
            pathname === "/bits/"
        ) {
            return;
        }

        const isPanelLink =
            pathname.startsWith("/thoughts/") || pathname.startsWith("/bits/");

        if (isPanelLink && resolvedUrl.origin === window.location.origin) {
            e.preventDefault();
            loadAndStackPanel(pathname);
        }
    }

    async function loadAndStackPanel(url) {
        const existingPanel = panels.find((p) => p.url === url);

        if (existingPanel) {
            bringToFront(existingPanel.id);
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`Failed to fetch: ${response.status}`);

            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            let contentElement = null;

            const pubDate = doc.getElementById("pubDate").textContent;

            const selectors = ["article", "main"];
            for (const selector of selectors) {
                try {
                    contentElement = doc.querySelector(selector);
                    if (contentElement) break;
                } catch (e) {
                    console.warn(`Selector ${selector} failed:`, e);
                }
            }

            if (!contentElement) {
                console.error("Could not find content in fetched page");
                return;
            }

            const titleElement = doc.querySelector("div.title");
            const title = titleElement ? titleElement.textContent : "Untitled";

            createPanel(url, title, pubDate, contentElement.innerHTML);
        } catch (error) {
            console.error("Error loading panel:", error);
        }
    }

    function createPanel(url, title, pubDate, content) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;

        // Remove elements that shouldn't appear in panels
        const excludedElements = tempDiv.querySelectorAll(
            ".exclude-from-panel",
        );
        excludedElements.forEach((el) => el.remove());

        const elementsWithIds = tempDiv.querySelectorAll("[id]");
        elementsWithIds.forEach((el) => {
            const id = el.getAttribute("id");
            if (id && /^\d/.test(id)) {
                el.setAttribute("id", "heading-" + id);
            }
        });

        const anchorLinks = tempDiv.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach((link) => {
            const href = link.getAttribute("href");
            const hash = href.substring(1);
            if (/^\d/.test(hash)) {
                link.setAttribute("href", "#heading-" + hash);
            }
        });

        const sanitizedContent = tempDiv.innerHTML;

        const newPanel = {
            id: Date.now(),
            url,
            title,
            pubDate,
            content: sanitizedContent,
            zIndex: maxZIndex + 1,
        };

        panels = [...panels, newPanel];
        maxZIndex += 1;

        savePanelsToStorage();
    }

    function bringToFront(panelId) {
        panels = panels.map((panel) => {
            if (panel.id === panelId) {
                maxZIndex += 1;
                return { ...panel, zIndex: maxZIndex };
            }
            return panel;
        });

        savePanelsToStorage();
    }

    function closePanel(panelId) {
        panels = panels.filter((panel) => panel.id !== panelId);

        savePanelsToStorage();
    }

    function isTopPanel(panel) {
        const maxZ = Math.max(...panels.map((p) => p.zIndex));
        return panel.zIndex === maxZ;
    }

    $: sortedPanels = [...panels].sort((a, b) => a.zIndex - b.zIndex);
</script>

<div class="stacked-panel-container" class:disabled={!isEnabled}>
    {#if isEnabled}
        {#each sortedPanels as panel, index (panel.id)}
            {@const isTop = isTopPanel(panel)}
            {@const isSinglePanel = sortedPanels.length === 1}
            {@const isFirstInactive = !isTop && index === 0}
            <div
                class="stacked-panel"
                class:is-top={isTop}
                class:single-panel={isSinglePanel}
                class:first-inactive={isFirstInactive}
                data-panel-id={panel.id}
                style="
          top: {index * STACK_OFFSET}px;
          z-index: {panel.zIndex};
          --panel-top: {index * STACK_OFFSET}px;
        "
            >
                {#if !isTop}
                    <div
                        class="panel-header inactive clickable"
                        on:click={() => bringToFront(panel.id)}
                        role="button"
                        tabindex="0"
                        on:keydown={(e) =>
                            e.key === "Enter" && bringToFront(panel.id)}
                    >
                        {panel.title}
                        <div class="panel-actions">
                            <a
                                href={panel.url}
                                class="open-link small"
                                title="Open in full page"
                                aria-label="Open in full page"
                                on:click|stopPropagation
                            >
                                go to page
                            </a>
                            <button
                                class="close-button small"
                                on:click|stopPropagation={() =>
                                    closePanel(panel.id)}
                                aria-label="Close panel"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                {:else}
                    <div class="panel-header">
                        <div>
                            <span>{panel.title}</span>
                        </div>
                        <div class="panel-actions">
                            <a
                                href={panel.url}
                                class="open-link"
                                title="Open in full page"
                                aria-label="Open in full page"
                                on:click|stopPropagation
                            >
                                go to page
                            </a>
                            <button
                                class="close-button"
                                on:click|stopPropagation={() =>
                                    closePanel(panel.id)}
                                aria-label="Close panel"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                {/if}

                {#if isTop}
                    <div class="panel-content">
                        {@html panel.content}
                    </div>
                {/if}
            </div>
        {/each}

        {#if panels.length === 0}
            <div class="empty-state"></div>
        {/if}
    {/if}
</div>

<style>
    .stacked-panel-container {
        position: fixed;
        left: calc(50% + 40ch);
        width: min(calc(var(--left-pad-for-panels) - 20ch), calc(40vw - 240px));
        margin-top: 42px;
        height: auto;
        background-color: var(--main-bg);
        padding-right: calc(var(--q) * 4);
    }

    .stacked-panel-container.disabled {
        display: none;
    }

    .stacked-panel {
        display: flex;
        flex-direction: column;
        position: absolute;
        max-height: calc(100vh - var(--panel-top) - 240px);
        left: 0;
        right: 0;
        background-color: var(--main-bg);
        overflow: hidden;
        animation: slideDown 0.3s linear;
        border: 1px solid var(--main-border);
        box-shadow:
            0 4px 16px rgba(0, 0, 0, 0.12),
            0 2px 4px rgba(0, 0, 0, 0.08);
    }

    /* Single panel: all corners rounded */
    .stacked-panel.single-panel {
        border-radius: var(--border-s);
    }

    /* Multiple panels - active (top) panel: only bottom corners */
    .stacked-panel.is-top:not(.single-panel) {
        border-radius: 0 0 8px 8px;
    }

    /* Multiple panels - first inactive panel: only top corners */
    .stacked-panel.first-inactive {
        border-radius: 8px 8px 0 0;
        border: 1px solid var(--main-border);
        box-shadow:
            0 4px 16px rgba(0, 0, 0, 0.12),
            0 2px 4px rgba(0, 0, 0, 0.08);
    }

    /* Other inactive panels: no border radius */
    .stacked-panel:not(.is-top):not(.first-inactive):not(.single-panel) {
        border-radius: 0;
    }

    .panel-header {
        font-weight: 500;
        font-size: 15px;
        line-height: 1;
        padding: 8px;
        height: 32px;
        color: white;
        background-color: var(--rams-red);
        text-transform: uppercase;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .panel-header.inactive {
        background-color: var(--link-bg);
        font-weight: 500;
        font-size: 12px;
        height: 32px;
        line-height: 1;
        padding: 0 8px 0;
        color: var(--text);
        cursor: pointer;
    }

    .panel-header.inactive:hover {
        background-color: var(--rams-red);
        color: white;
    }

    .panel-header.clickable {
        cursor: pointer;
    }

    .panel-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .open-link {
        display: flex;
        font-size: 12px;
        align-items: center;
        height: 20px;
        justify-content: center;
        background-color: var(--rams-red);
        color: white;
        border-radius: var(--border-s);
        cursor: pointer;
        text-decoration: none;
        padding: 4px;
        transition: color 0.2s;
    }

    .open-link:hover {
        background-color: var(--rams-orange);
    }

    .open-link::after {
        content: "↗";
        margin-left: 4px;
    }

    .open-link.small {
        opacity: 0.7;
    }

    .open-link.small:hover {
        opacity: 1;
    }

    .close-button {
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        width: 20px;
        height: 20px;
        margin: 4px;
        border-radius: var(--border-s);
        border: none;
        cursor: pointer;
        transition: color 0.2s;
        background-color: inherit;
        font-size: 14px;
        line-height: 1;
    }

    .close-button:hover {
        background-color: var(--rams-orange);
    }

    .close-button.small {
        font-size: 12px;
        opacity: 0.7;
        color: var(--text);
    }

    .close-button.small:hover {
        opacity: 1;
    }

    .panel-content {
        flex: 1;
        text-align: justify;
        hyphens: auto;
        background-color: white;
        overflow-y: auto;
        padding: 20px;
    }

    /* Style content within the panel */
    .panel-content :global(a) {
        text-decoration: none;
    }

    .panel-content :global(a:hover) {
        text-decoration: underline;
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #9ca3af;
        font-size: 1.1rem;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
