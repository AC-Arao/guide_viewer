// Minimal MD heading parser + navigator for the demo
(function () {
  const MD_PATH = "guide.md"; // served from the same folder as index.html

  const contentEl = document.getElementById("content");
  const tocEl = document.getElementById("tocList");
  const overlayEl = document.getElementById("overlay");
  const loadingEl = document.getElementById("loading");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const autoscrollEl = document.getElementById("autoscroll");
  const autoreloadEl = document.getElementById("autoreload");
  const toggleOverlayBtn = document.getElementById("toggleOverlayBtn");
  const previewOnlyBtn = document.getElementById("previewOnlyBtn");
  const edgePrev = document.getElementById("edgePrev");
  const edgeNext = document.getElementById("edgeNext");
  const miniPrev = document.getElementById("miniPrev");
  const miniNext = document.getElementById("miniNext");

  let nodes = []; // {id, level, text, note?, elMain, elToc}
  let currentIndex = -1;
  let reloadTimer = null;
  let wasOverlayHidden = false;

  async function loadMarkdown() {
    // First, try HTTP fetch relative to the current page
    try {
      console.log("[guide_viewer] loading:", MD_PATH);
      const res = await fetch(MD_PATH, { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status + " " + res.statusText);
      const md = await res.text();
      render(md);
      return;
    } catch (httpErr) {
      console.warn("[guide_viewer] HTTP fetch failed, trying Electron preload fallback...", httpErr);
      // Fallback for Electron: use preload API to read from disk
      try {
        if (window.demoViewer && typeof window.demoViewer.readGuideMd === 'function') {
          const md = await window.demoViewer.readGuideMd();
          render(md);
          return;
        }
        throw httpErr;
      } catch (e) {
        loadingEl.textContent = `読み込み失敗: ${e.message}`;
        console.error("[guide_viewer] load error:", e);
      }
    }
  }

  function parse(md) {
    // Parse only headings (#, ##, ###) and capture bullet notes that follow
    const lines = md.split(/\r?\n/);
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const m = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
      if (m) {
        const level = m[1].length; // 1,2,3
        const text = m[2];
        const id = `h_${out.length}_${Date.now()}`; // simple unique id
        const item = { id, level, text, note: null, noteLines: null };

        // Capture 1-2 following non-empty lines that look like notes/bullets
        const notes = [];
        const noteLines = [];
        let j = i + 1;
        while (j < lines.length) {
          const ln = lines[j];
          if (/^\s*$/.test(ln)) { j++; continue; }
          if (/^#{1,6}\s+/.test(ln)) break; // next heading
          if (/^[-*]\s+/.test(ln)) {
            const t = ln.replace(/^[-*]\s+/, "");
            notes.push(t);
            noteLines.push({ type: 'li', text: t });
          } else if (level >= 2 && ln.trim().length && notes.length === 0) {
            const t = ln.trim();
            notes.push(t);
            noteLines.push({ type: 'p', text: t });
          } else {
            // stop collecting if it's not a bullet and not the first single-line note
            break;
          }
          j++;
        }
        if (notes.length) {
          item.note = notes.join("\n");
          item.noteLines = noteLines;
        }

        out.push(item);
        i = j; // continue after consumed block
      } else {
        i++;
      }
    }
    return out;
  }

  function render(md) {
    nodes = parse(md);
    contentEl.innerHTML = "";
    tocEl.innerHTML = "";
    if (loadingEl && loadingEl.parentNode) loadingEl.remove();

    if (!nodes.length) {
      // Fallback: render raw markdown if no headings were parsed
      const warn = document.createElement("div");
      warn.className = "note";
      warn.textContent = "見出し(#/##/###)が見つかりませんでした。原文を表示します。";
      const pre = document.createElement("pre");
      pre.className = "raw-md";
      pre.textContent = md.slice(0, 20000);
      contentEl.appendChild(warn);
      contentEl.appendChild(pre);
      return;
    }

    nodes.forEach((n, idx) => {
      // Main content block
      const sec = document.createElement("section");
      sec.className = `section l${n.level}`;
      sec.id = n.id;
      const h = document.createElement(n.level === 1 ? "h1" : n.level === 2 ? "h2" : "h3");
      h.innerHTML = renderInlineMd(n.text);
      sec.appendChild(h);
      if (n.note || n.noteLines) {
        const note = document.createElement("div");
        note.className = "note";
        if (Array.isArray(n.noteLines) && n.noteLines.length) {
          const hasBullets = n.noteLines.some(x => x.type === 'li');
          const firstPara = n.noteLines.find(x => x.type === 'p');
          if (firstPara) {
            const para = document.createElement("div");
            para.innerHTML = renderInlineMd(firstPara.text);
            note.appendChild(para);
          }
          if (hasBullets) {
            const ul = document.createElement("ul");
            n.noteLines.filter(x => x.type === 'li').forEach(x => {
              const li = document.createElement("li");
              li.innerHTML = renderInlineMd(x.text);
              ul.appendChild(li);
            });
            note.appendChild(ul);
          } else if (!firstPara) {
            note.innerHTML = renderInlineMd(n.note, { withBreaks: true });
          }
        } else {
          note.innerHTML = renderInlineMd(n.note, { withBreaks: true });
        }
        sec.appendChild(note);
      }
      // Enable click-to-focus on the section itself (handy in preview-only)
      sec.addEventListener("click", () => setCurrent(idx, true));
      contentEl.appendChild(sec);
      n.elMain = sec;

      // TOC item
      const tocItem = document.createElement("div");
      tocItem.className = `toc-item toc-l${n.level}`;
      tocItem.innerHTML = renderInlineMd(n.text);
      tocItem.addEventListener("click", () => setCurrent(idx, true));
      tocEl.appendChild(tocItem);
      n.elToc = tocItem;
    });

    // Focus first actionable step (prefer level 3)
    const firstL3 = nodes.findIndex(n => n.level === 3);
    const startIdx = firstL3 >= 0 ? firstL3 : 0;
    setCurrent(startIdx, false);
  }

  function setCurrent(idx, userInitiated) {
    if (idx < 0 || idx >= nodes.length) return;
    if (currentIndex === idx) return;

    // clear
    if (currentIndex >= 0) {
      nodes[currentIndex].elMain.classList.remove("current");
      nodes[currentIndex].elToc.classList.remove("toc-current");
    }

    currentIndex = idx;

    const n = nodes[idx];
    n.elMain.classList.add("current");
    n.elToc.classList.add("toc-current");

    const preferred = contentEl.querySelector(`#${n.id}`);
    if (autoscrollEl.checked && preferred) {
      preferred.scrollIntoView({ behavior: userInitiated ? "smooth" : "instant", block: "center" });
    }

    updateOverlay();
  }

  function updateOverlay() {
    if (overlayEl.classList.contains("hidden")) return;
    const n = nodes[currentIndex];
    if (!n) return;
    overlayEl.innerHTML = `<span class=\"label\">実行中</span><div class=\"now\">${renderInlineMd(n.text)}</div>`;
  }

  function markDone(idx) {
    const n = nodes[idx];
    if (!n) return;
    n.elMain.classList.add("done");
    n.elToc.classList.add("toc-done");
  }

  function escapeHtml(s) {
    return s.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // Inline helpers for minimal markdown styling (bold only)
  function renderInlineMd(text, opts = {}) {
    const withBreaks = !!opts.withBreaks;
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="md-strong">$1<\/strong>');
    html = html.replace(/__(.+?)__/g, '<strong class="md-strong">$1<\/strong>');
    if (withBreaks) html = html.replace(/\n/g, '<br>');
    return html;
  }

  // Controls
  prevBtn.addEventListener("click", () => setCurrent(Math.max(0, currentIndex - 1), true));
  nextBtn.addEventListener("click", () => setCurrent(Math.min(nodes.length - 1, currentIndex + 1), true));
  toggleOverlayBtn.addEventListener("click", () => {
    overlayEl.classList.toggle("hidden");
    updateOverlay();
  });

  function setPreviewOnly(enabled) {
    document.body.classList.toggle("preview-only", !!enabled);
    if (enabled) {
      wasOverlayHidden = overlayEl.classList.contains("hidden");
      overlayEl.classList.add("hidden");
    } else {
      if (!wasOverlayHidden) overlayEl.classList.remove("hidden");
    }
  }
  previewOnlyBtn.addEventListener("click", () => setPreviewOnly(!document.body.classList.contains("preview-only")));
  edgePrev.addEventListener("click", () => setCurrent(Math.max(0, currentIndex - 1), true));
  edgeNext.addEventListener("click", () => setCurrent(Math.min(nodes.length - 1, currentIndex + 1), true));
  if (miniPrev) miniPrev.addEventListener("click", () => setCurrent(Math.max(0, currentIndex - 1), true));
  if (miniNext) miniNext.addEventListener("click", () => setCurrent(Math.min(nodes.length - 1, currentIndex + 1), true));

  // Optional: auto-reload for when guide.md changes while presenting
  autoreloadEl.addEventListener("change", () => {
    if (autoreloadEl.checked) {
      if (!reloadTimer) reloadTimer = setInterval(async () => {
        // naive approach: re-render and try to keep position by text match
        const beforeText = nodes[currentIndex]?.text;
        await loadMarkdown();
        if (beforeText) {
          const idx = nodes.findIndex(n => n.text === beforeText);
          if (idx >= 0) setCurrent(idx, false);
        }
      }, 3000);
    } else {
      clearInterval(reloadTimer);
      reloadTimer = null;
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") {
      setCurrent(Math.min(nodes.length - 1, currentIndex + 1), true);
    } else if (e.key === "p" || e.key === "P" || e.key === "ArrowLeft") {
      setCurrent(Math.max(0, currentIndex - 1), true);
    } else if (e.key === "h" || e.key === "H") {
      overlayEl.classList.toggle("hidden");
      updateOverlay();
    } else if (e.key === "v" || e.key === "V") {
      setPreviewOnly(!document.body.classList.contains("preview-only"));
    } else if (e.key === "d" || e.key === "D") {
      // mark current as done and advance
      markDone(currentIndex);
      setCurrent(Math.min(nodes.length - 1, currentIndex + 1), true);
    }
  });

  // Init
  loadMarkdown();
  // URL param: ?preview=1 (or &p=1)
  const params = new URLSearchParams(location.search);
  const pv = params.get("preview") ?? params.get("p");
  if (pv && pv !== "0" && pv !== "false") setPreviewOnly(true);
})();
 
