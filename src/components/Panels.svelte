<script>
    import { onMount } from "svelte";

    // --- State ---
    // One unified list. pinned:false = hover preview (dismisses on mouseout), pinned:true = sticky window
    let windows = [];
    let contentCache = new Map();
    let maxZIndex = 200;
    let showTimer = null;
    let dismissTimers = new Map(); // url → timer

    const SHOW_DELAY = 200;
    const DISMISS_DELAY = 350;
    const WIN_WIDTH = 480;
    const WIN_HEIGHT = 320;
    const PREVIEW_OFFSET = 14;
    let WIN_HEIGHT_MAX = 500;

    // --- Mount ---
    onMount(() => {
        WIN_HEIGHT_MAX = Math.round(window.innerHeight * 0.6);
        document.addEventListener("mouseover", handleMouseOver);
        document.addEventListener("mouseout", handleMouseOut);
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
        return () => {
            document.removeEventListener("mouseover", handleMouseOver);
            document.removeEventListener("mouseout", handleMouseOut);
            document.removeEventListener("mousemove", onDragMove);
            document.removeEventListener("mouseup", onDragEnd);
        };
    });

    // --- Helpers ---
    function isInternalPostLink(href) {
        if (!href) return false;
        try {
            const url = new URL(href, window.location.href);
            if (url.origin !== window.location.origin) return false;
            const p = url.pathname;
            return (
                (p.startsWith("/thoughts/") || p.startsWith("/bits/")) &&
                p !== "/thoughts/" &&
                p !== "/bits/"
            );
        } catch {
            return false;
        }
    }

    function getLinkEl(target) {
        const a = target?.closest("a");
        if (!a) return null;
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#")) return null;
        if (a.closest("nav") || a.closest("header")) return null;
        if (!isInternalPostLink(href)) return null;
        return a;
    }

    function resolvedPath(href) {
        return new URL(href, window.location.href).pathname;
    }

    function calcPos(rect) {
        const margin = 8;
        let x = rect.left;
        let y = rect.bottom + PREVIEW_OFFSET;
        if (x + WIN_WIDTH > window.innerWidth - margin)
            x = window.innerWidth - WIN_WIDTH - margin;
        if (x < margin) x = margin;
        if (y + WIN_HEIGHT > window.innerHeight - margin)
            y = rect.top - WIN_HEIGHT - PREVIEW_OFFSET;
        if (y < margin) y = margin;
        return { x, y };
    }

    function getWindowElForUrl(url) {
        return document.querySelector(`[data-win-url="${CSS.escape(url)}"]`);
    }

    // --- Dismiss timers ---
    function startDismiss(url) {
        clearDismiss(url);
        const t = setTimeout(() => {
            dismissTimers.delete(url);
            // Final check: if mouse is physically still over the window, don't dismiss
            const winEl = document.querySelector(
                `[data-win-url="${CSS.escape(url)}"]`,
            );
            if (winEl?.matches(":hover")) return;
            windows = windows.filter((w) => w.url !== url);
        }, DISMISS_DELAY);
        dismissTimers.set(url, t);
    }

    function clearDismiss(url) {
        if (dismissTimers.has(url)) {
            clearTimeout(dismissTimers.get(url));
            dismissTimers.delete(url);
        }
    }

    // --- Hover: show ---
    function handleMouseOver(e) {
        const a = getLinkEl(e.target);
        if (!a) return;

        const url = resolvedPath(a.getAttribute("href"));

        // Window already open for this url — just cancel any pending dismiss
        if (windows.some((w) => w.url === url)) {
            clearDismiss(url);
            return;
        }

        clearTimeout(showTimer);
        showTimer = setTimeout(async () => {
            const rect = a.getBoundingClientRect();
            const pos = calcPos(rect);
            maxZIndex += 1;

            if (contentCache.has(url)) {
                const { title, content } = contentCache.get(url);
                windows = [
                    ...windows,
                    {
                        id: Date.now(),
                        url,
                        title,
                        content,
                        ...pos,
                        zIndex: maxZIndex,
                        pinned: false,
                        loading: false,
                    },
                ];
            } else {
                windows = [
                    ...windows,
                    {
                        id: Date.now(),
                        url,
                        title: "Loading…",
                        content: "",
                        ...pos,
                        zIndex: maxZIndex,
                        pinned: false,
                        loading: true,
                    },
                ];
                const result = await fetchContent(url);
                if (result)
                    windows = windows.map((w) =>
                        w.url === url ? { ...w, ...result, loading: false } : w,
                    );
            }
        }, SHOW_DELAY);
    }

    // --- Hover: hide ---
    function handleMouseOut(e) {
        const fromLink = getLinkEl(e.target);
        const toEl = e.relatedTarget;

        // Leaving a link
        if (fromLink) {
            const url = resolvedPath(fromLink.getAttribute("href"));
            const win = windows.find((w) => w.url === url);
            if (!win || win.pinned) return;
            // Moving into the window itself — keep it
            const winEl = getWindowElForUrl(url);
            if (winEl && toEl && winEl.contains(toEl)) {
                clearDismiss(url);
                return;
            }
            clearTimeout(showTimer);
            startDismiss(url);
        }

        // Leaving a window
        const winEl = e.target?.closest("[data-win-url]");
        if (winEl) {
            const url = winEl.dataset.winUrl;
            const win = windows.find((w) => w.url === url);
            if (!win || win.pinned) return;
            // Internal DOM mutation (Svelte re-render swapping nodes) — ignore
            if (toEl && winEl.contains(toEl)) return;
            // Moving back to the triggering link — keep it
            const targetLink = getLinkEl(toEl);
            if (
                targetLink &&
                resolvedPath(targetLink.getAttribute("href")) === url
            ) {
                clearDismiss(url);
                return;
            }
            startDismiss(url);
        }
    }

    // --- Content fetching ---
    async function fetchContent(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const titleEl = doc.querySelector("h1.displayTitle");
            const title = titleEl?.textContent?.trim() || "Untitled";

            const contentEl = doc.querySelector("main");
            if (!contentEl) return null;

            const tmp = document.createElement("div");
            tmp.innerHTML = contentEl.innerHTML;

            const pubDateEl = tmp.querySelector("#pubDate");
            const metaHTML = pubDateEl ? pubDateEl.innerHTML : null;
            metaHTML;

            tmp.querySelectorAll(".exclude-from-panel, .banner, hr").forEach(
                (el) => el.remove(),
            );

            if (metaHTML) {
                const meta = document.createElement("div");
                meta.className = "panel-meta";
                meta.innerHTML = metaHTML;
                meta.querySelectorAll(".sep-icon").forEach((el) => {
                    el.innerHTML = ".\u00A0";
                });
                tmp.prepend(meta);
            }

            tmp.querySelectorAll("[id]").forEach((el) => {
                const id = el.getAttribute("id");
                if (id && /^\d/.test(id)) el.setAttribute("id", "p-" + id);
            });
            tmp.querySelectorAll('a[href^="#"]').forEach((a) => {
                const hash = a.getAttribute("href").slice(1);
                if (/^\d/.test(hash)) a.setAttribute("href", "#p-" + hash);
            });

            const content = tmp.innerHTML;
            contentCache.set(url, { title, content });
            return { title, content };
        } catch (err) {
            console.error("Failed to fetch preview:", err);
            return null;
        }
    }

    // --- Pin toggle ---
    function togglePin(id) {
        const win = windows.find((w) => w.id === id);
        if (!win) return;
        if (win.pinned) {
            // Unpin → go back to hover mode, but don't dismiss yet.
            // mouseout will start the dismiss timer when mouse actually leaves.
            // noAnim: true prevents the fadeIn animation from replaying.
            windows = windows.map((w) =>
                w.id === id ? { ...w, pinned: false, noAnim: true } : w,
            );
        } else {
            // Pin → cancel any pending dismiss, stay
            clearDismiss(win.url);
            windows = windows.map((w) =>
                w.id === id ? { ...w, pinned: true } : w,
            );
        }
    }

    function closeWindow(id) {
        const win = windows.find((w) => w.id === id);
        if (win) clearDismiss(win.url);
        windows = windows.filter((w) => w.id !== id);
    }

    function bringToFront(id) {
        maxZIndex += 1;
        windows = windows.map((w) =>
            w.id === id ? { ...w, zIndex: maxZIndex } : w,
        );
    }

    // --- Drag (pinning via drag) ---
    let dragging = null;

    function onTitleMouseDown(e, id) {
        if (e.button !== 0) return;
        if (e.target.closest("button") || e.target.closest("a")) return;
        e.preventDefault();
        const win = windows.find((w) => w.id === id);
        if (!win) return;
        // Dragging always pins
        clearDismiss(win.url);
        windows = windows.map((w) =>
            w.id === id ? { ...w, pinned: true } : w,
        );
        bringToFront(id);
        dragging = {
            id,
            startX: e.clientX,
            startY: e.clientY,
            origX: win.x,
            origY: win.y,
        };
    }

    function onDragMove(e) {
        if (!dragging) return;
        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        windows = windows.map((w) => {
            if (w.id !== dragging.id) return w;
            const x = Math.max(
                4,
                Math.min(
                    window.innerWidth - WIN_WIDTH - 4,
                    dragging.origX + dx,
                ),
            );
            const y = Math.max(
                4,
                Math.min(
                    window.innerHeight - WIN_HEIGHT - 4,
                    dragging.origY + dy,
                ),
            );
            return { ...w, x, y };
        });
    }

    function onDragEnd() {
        dragging = null;
    }

    // Svelte action: restore scroll on mount
    function initScroll(node, scrollTop) {
        node.scrollTop = scrollTop ?? 0;
        return {};
    }

    // --- Icons ---
    const iconPin = `<g fill="currentColor"><path d="m229.66 98.34l-57.27 57.46c11.46 22.93-1.72 45.86-10.11 57a8 8 0 0 1-12 .83L42.34 105.76A8 8 0 0 1 43 93.85c29.65-23.92 57.4-10 57.4-10l57.27-57.46a8 8 0 0 1 11.31 0L229.66 87a8 8 0 0 1 0 11.34" opacity=".2"/><path d="m235.32 81.37l-60.69-60.68a16 16 0 0 0-22.63 0l-53.63 53.8c-10.66-3.34-35-7.37-60.4 13.14a16 16 0 0 0-1.29 23.78L85 159.71l-42.66 42.63a8 8 0 0 0 11.32 11.32L96.29 171l48.29 48.29A16 16 0 0 0 155.9 224h1.13a15.93 15.93 0 0 0 11.64-6.33c19.64-26.1 17.75-47.32 13.19-60L235.33 104a16 16 0 0 0-.01-22.63M224 92.69l-57.27 57.46a8 8 0 0 0-1.49 9.22c9.46 18.93-1.8 38.59-9.34 48.62L48 100.08c12.08-9.74 23.64-12.31 32.48-12.31A40.1 40.1 0 0 1 96.81 91a8 8 0 0 0 9.25-1.51L163.32 32L224 92.68Z"/></g>`;
    const iconPinSlash = `<g fill="currentColor"><path d="m229.66 98.34l-57.27 57.46c11.46 22.93-1.72 45.86-10.11 57a8 8 0 0 1-12 .83L42.34 105.76A8 8 0 0 1 43 93.85c29.65-23.92 57.4-10 57.4-10l57.27-57.46a8 8 0 0 1 11.31 0L229.66 87a8 8 0 0 1 0 11.34" opacity=".2"/><path d="M53.92 34.62a8 8 0 1 0-11.84 10.76L67.37 73.2A69.8 69.8 0 0 0 38 87.63a16 16 0 0 0-1.29 23.78L85 159.71l-42.66 42.63a8 8 0 0 0 11.32 11.32L96.29 171l48.29 48.29A16 16 0 0 0 155.9 224h1.13a15.93 15.93 0 0 0 11.64-6.33a89.8 89.8 0 0 0 11.58-20.27l21.84 24a8 8 0 1 0 11.84-10.76ZM155.9 208L48 100.08c10.23-8.25 21.2-12.36 32.66-12.27l87.16 95.88c-2.23 9.87-7.58 18.54-11.92 24.31m79.42-104l-44.64 44.79a8 8 0 1 1-11.33-11.3L224 92.7L163.32 32L122.1 73.35a8 8 0 0 1-11.33-11.29L152 20.7a16 16 0 0 1 22.63 0l60.69 60.68a16 16 0 0 1 0 22.62"/></g>`;
    const iconOpen = `<g fill="currentColor"><path d="M224 48v160a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16h160a16 16 0 0 1 16 16" opacity=".2"/><path d="M216 48v48a8 8 0 0 1-16 0V67.31l-50.34 50.35a8 8 0 0 1-11.32-11.32L188.69 56H160a8 8 0 0 1 0-16h48a8 8 0 0 1 8 8m-109.66 90.34L56 188.69V160a8 8 0 0 0-16 0v48a8 8 0 0 0 8 8h48a8 8 0 0 0 0-16H67.31l50.35-50.34a8 8 0 0 0-11.32-11.32"/></g>`;
    const iconTrash = `<g fill="currentColor"><path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2"/><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0"/></g>`;
</script>

{#each windows as win (win.id)}
    <div
        class="win"
        class:pinned={win.pinned}
        class:no-anim={win.noAnim}
        data-win-url={win.url}
        style="left:{win.x}px; top:{win.y}px; width:{WIN_WIDTH}px; height:{WIN_HEIGHT}px; z-index:{win.zIndex};"
        on:mousedown={() => bringToFront(win.id)}
        role="dialog"
        aria-label={win.title}
    >
        <div class="titlebar" on:mousedown={(e) => onTitleMouseDown(e, win.id)}>
            <span class="win-title">{win.title}</span>
            <div class="actions">
                <button
                    class="icon-btn"
                    class:active={win.pinned}
                    on:click|stopPropagation={() => togglePin(win.id)}
                    title={win.pinned ? "Unpin" : "Pin"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 256 256"
                    >
                        {@html win.pinned ? iconPinSlash : iconPin}
                    </svg>
                </button>
                <a
                    href={win.url}
                    class="icon-btn"
                    on:click|stopPropagation
                    title="Open"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 256 256">{@html iconOpen}</svg
                    >
                </a>
                <button
                    class="icon-btn"
                    on:click|stopPropagation={() => closeWindow(win.id)}
                    title="Close"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 256 256">{@html iconTrash}</svg
                    >
                </button>
            </div>
        </div>
        {#if win.loading}
            <div class="win-loading">Loading…</div>
        {:else}
            <div class="win-content">{@html win.content}</div>
        {/if}
    </div>
{/each}

<style>
    .win {
        position: fixed;
        background: var(--bg);
        border: 2px solid var(--border-default);
        border-radius: 0;
        box-shadow: 4px 4px 0 #bbb;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-size: 0.9rem;
        animation: fadeIn 0.15s ease;
    }

    :global(html:not([data-theme="light"])) .win {
        box-shadow: none;
    }

    .win.pinned {
        animation: none;
    }

    .win.no-anim {
        animation: none;
    }

    .titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 6px 10px;
        background: var(--bg-surface);
        border-bottom: 2px solid var(--border-default);
        flex-shrink: 0;
        min-height: 36px;
        cursor: grab;
        user-select: none;
        position: relative;
        z-index: 1;
    }

    .titlebar:active {
        cursor: grabbing;
    }

    .win-title {
        font-family: var(--font-display);
        font-weight: 700;
        color: var(--text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        letter-spacing: 0.03em;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
    }

    .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;
        background: none;
        border: none;
        color: var(--text-muted);
        text-decoration: none;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.1s;
        flex-shrink: 0;
    }

    .icon-btn:hover {
        opacity: 1;
        background: none;
    }

    .icon-btn.active {
        opacity: 1;
    }

    .win-loading {
        padding: 1rem;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 0.8rem;
    }

    .win-content {
        container-type: inline-size;
        flex: 1;
        overflow-y: auto;
        padding: 16px 20px;
        min-height: 0;
        scrollbar-color: var(--border-default) var(--bg-raised);
        scrollbar-width: thin;
    }

    .win-content::-webkit-scrollbar {
        width: 5px;
    }
    .win-content::-webkit-scrollbar-track {
        background: var(--bg-raised);
    }
    .win-content::-webkit-scrollbar-thumb {
        background: var(--border-default);
        border-radius: 3px;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(6px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media (max-width: 768px) {
        .win {
            display: none;
        }
    }

    @container (max-width: 480px) {
        /* styles that apply on the panels */
        /* this is the hack to have the same styling on posts as if they are rendered inside a
        mobile viewport */
        /* media queries work only for the whole viewport. therefore container queries are used */

        .win-content :global(.panel-meta) {
            display: flex;
            font-size: 0.75rem;
            font-family: var(--font-mono);
            color: var(--fg-muted);
            padding-bottom: 0.75rem;
            margin-bottom: 1rem;
            border-bottom: 1px solid var(--border-subtle);
        }

        .win-content :global(.post-body ul),
        .win-content :global(.post-body ol) {
            padding-left: calc(var(--q) * 4);
        }

        .win-content :global(.sidenote) {
            float: none;
            clear: both;
            display: block;
            width: auto;
            margin-right: 0;
            margin-top: 0.5rem;
            margin-bottom: 1rem;
            padding: 0.6rem 1rem;
            background: var(--bg-raised);
            padding-top: 0.6rem;
        }
    }
</style>
