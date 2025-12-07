<script>
    import { onMount } from "svelte";

    let panels = [];
    let maxZIndex = 100;
    const STACK_OFFSET = 19;
    let containerElement;
    let isEnabled = true;
    const MOBILE_BREAKPOINT = 768;
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

        if (wasEnabled && !isEnabled) {
            panels = [];
        }

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

                panels = [...(panelState.panels || [])];
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

        if (pathname === "/blog" || pathname === "/blog/") {
            return;
        }

        const isBlogLink = pathname.startsWith("/blog/");

        if (isBlogLink && resolvedUrl.origin === window.location.origin) {
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

            const titleElement = doc.querySelector("h1");
            const title = titleElement ? titleElement.textContent : "Untitled";

            createPanel(url, title, pubDate, contentElement.innerHTML);
        } catch (error) {
            console.error("Error loading panel:", error);
        }
    }

    function createPanel(url, title, pubDate, content) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;

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

<div class="spacer"></div>
<div class="stacked-panel-container" class:disabled={!isEnabled}>
    {#if isEnabled}
        {#each sortedPanels as panel, index (panel.id)}
            {@const isTop = isTopPanel(panel)}
            <div
                class="stacked-panel"
                class:is-top={isTop}
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
                        {panel.title}, {panel.pubDate}
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
                            <span>{panel.title}</span>,
                            <span class="panel-pubDate">{panel.pubDate}</span>
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
        top: 0;
        left: 70ch; /* 70ch (main content width) + 20px gap */
        width: calc(70ch - 40px);
        margin-top: 20px;
        height: auto;
        transform: translate(0px, 20px, 20px, 20px);
        background-color: var(--main-bg);
        opacity: 0.7;
    }

    .stacked-panel-container:hover {
        opacity: 1;
    }

    .stacked-panel-container.disabled {
        display: none;
    }

    .stacked-panel {
        position: absolute;
        left: 0;
        right: 0;
        max-height: calc(100vh - var(--panel-top) - 40px);
        background-color: var(--main-bg);
        display: flex;
        flex-direction: column;
        transition: left 0.3s cubic-bezier(0.075, 0.82, 0.165, 1);
    }

    .panel-header {
        font-family: "Kode Mono Variable";
        font-weight: 500;
        font-size: 15px;
        line-height: 1;
        border: 1px solid var(--main-border);
        padding: 8px;
        height: 33px;
        color: white;
        background-color: #9a3a1e;
        text-transform: uppercase;
        box-shadow: inset 0 0 0px 1px var(--orange);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .panel-header.inactive {
        background-color: var(--nav-bg);
        font-family: "Kode Mono Variable";
        font-weight: 500;
        font-size: 15px;
        height: 20px;
        line-height: 1;
        padding: 0 8px 0;
        box-shadow: inset 0 0 0px 1px #ccc;
        color: var(--text);
        cursor: pointer;
    }

    .panel-header.inactive:hover {
        background-color: #f3f4f6;
    }

    .panel-header.clickable {
        cursor: pointer;
    }

    .panel-pubDate {
        font-style: italic;
        font-size: 14px;
    }

    .panel-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .open-link {
        display: flex;
        font-size: 0.9rem;
        align-items: center;
        justify-content: center;
        background: var(--banner-bg);
        color: white;
        border: none;
        cursor: pointer;
        text-decoration: none;
        padding: 2px;
        transition: color 0.2s;
    }

    .open-link:hover {
        color: var(--yellow);
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
        background: var(--banner-bg);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        transition: color 0.2s;
    }

    .close-button:hover {
        color: var(--yellow);
    }

    .close-button.small {
        opacity: 0.7;
    }

    .close-button.small:hover {
        opacity: 1;
    }

    .panel-content {
        flex: 1;
        background-color: white;
        border-width: 0px 1px 1px 1px;
        border-color: var(--main-border);
        border-style: solid;
        box-shadow: inset 0 0 0 1px white;
        overflow-y: auto;
        padding: 10px;
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

    .spacer {
        height: 20px;
    }

    /* Responsive design */
    @media (max-width: 1400px) {
        .stacked-panel-container {
            width: 50ch;
        }
    }

    @media (max-width: 768px) {
        .stacked-panel-container {
            width: 100%;
            left: 0;
        }
    }
</style>
