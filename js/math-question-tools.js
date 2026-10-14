(function () {
    'use strict';

    const symbols = [
        ['\\frac{□}{□}', 'ⁿ/ₙ', 'Kəsr'], ['\\sqrt{□}', '√', 'Kök'],
        ['^{□}', 'xⁿ', 'Üs'], ['_{□}', 'xₙ', 'Alt indeks'],
        ['\\pi', 'π', 'Pi'], ['\\theta', 'θ', 'Teta'],
        ['\\angle', '∠', 'Bucaq'], ['\\triangle', '△', 'Üçbucaq'],
        ['\\parallel', '∥', 'Paralel'], ['\\perp', '⊥', 'Perpendikulyar'],
        ['\\circ', '°', 'Dərəcə'], ['\\leq', '≤', 'Kiçik və ya bərabər'],
        ['\\geq', '≥', 'Böyük və ya bərabər'], ['\\neq', '≠', 'Bərabər deyil'],
        ['\\times', '×', 'Vurma'], ['\\div', '÷', 'Bölmə'],
        ['\\sum', '∑', 'Cəm'], ['\\int', '∫', 'İnteqral'],
    ];
    const shapes = [
        ['triangle', 'Üçbucaq'],
        ['rightTriangle', 'Düzbucaqlı üçbucaq'],
        ['square', 'Kvadrat'],
        ['rectangle', 'Düzbucaqlı'],
        ['circle', 'Çevrə'],
        ['parallelogram', 'Paraleloqram'],
    ];

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[char]);
    }

    function toolbarMarkup(inputId) {
        return `<div class="math-toolstrip" role="toolbar" aria-label="Riyazi işarələr">${symbols.map(([symbol, label, title]) =>
            `<button type="button" class="math-btn" title="${title}" aria-label="${title}" data-math-target="${inputId}" data-math-symbol="${escapeHtml(symbol)}">${label}</button>`
        ).join('')}</div>`;
    }

    function editorMarkup(id, initial = null) {
        const figure = normalizeFigure(initial);
        return `
            <div class="math-question-tools">
                <details class="geometry-editor" ${figure?.type === 'svg' ? 'open' : ''}>
                    <summary><i class="fas fa-draw-polygon"></i> Həndəsi fiqur əlavə et</summary>
                    <div class="geometry-fields">
                        <button type="button" class="btn btn-sm btn-primary geometry-draw-open" data-open-figure-drawing="${id}"><i class="fas fa-paintbrush"></i> Çəkmə lövhəsini aç</button>
                        <label>Fiqur
                            <select id="${id}_shape" data-figure-field="${id}" data-field="type">
                                <option value="">Fiqur seçin</option>
                                ${shapes.map(([value, label]) => `<option value="${value}" ${figure?.type === value ? 'selected' : ''}>${label}</option>`).join('')}
                            </select>
                        </label>
                        <label>Təpə nöqtələrinin adları
                            <input id="${id}_vertices" data-figure-field="${id}" data-field="vertices" maxlength="24" value="${escapeHtml(figure?.vertices || 'A, B, C')}" placeholder="A, B, C">
                        </label>
                        <label>Ölçü / bucaq qeydi
                            <input id="${id}_measure" data-figure-field="${id}" data-field="measure" maxlength="24" value="${escapeHtml(figure?.measure || '')}" placeholder="məs: 5 sm, 60°">
                        </label>
                        <button type="button" class="btn btn-sm btn-secondary" data-clear-figure="${id}">Fiquru sil</button>
                    </div>
                    <input type="hidden" id="${id}_svg" value="${escapeHtml(figure?.svg || '')}">
                    <div class="geometry-preview" id="${id}_figurePreview" aria-live="polite"></div>
                </details>
                <div class="figure-drawing-modal" data-figure-drawing="${id}" aria-hidden="true">
                    <section class="figure-drawing-panel" role="dialog" aria-modal="true" aria-labelledby="${id}_drawingTitle">
                        <header class="figure-drawing-header">
                            <div><h3 id="${id}_drawingTitle">Həndəsi fiqur çəkmə lövhəsi</h3><p>Fiquru çəkin, ölçüləri və nöqtə adlarını yazın.</p></div>
                            <button type="button" class="btn btn-sm btn-secondary" data-close-figure-drawing="${id}" aria-label="Lövhəni bağla">✕</button>
                        </header>
                        <div class="figure-drawing-meta">
                            <label>Fiqurun adı<input type="text" maxlength="60" data-drawing-title="${id}" placeholder="Məs: ABC üçbucağı"></label>
                            <label>Nöqtə adı / ölçü<input type="text" maxlength="40" data-drawing-label="${id}" placeholder="Məs: A, 5 sm, 60°"></label>
                            <label>Xətt rəngi<input type="color" value="#2563eb" data-drawing-color="${id}"></label>
                            <label>Xətt qalınlığı<select data-drawing-width="${id}"><option value="2">Nazik</option><option value="4" selected>Orta</option><option value="7">Qalın</option></select></label>
                        </div>
                        <div class="figure-drawing-tools" role="toolbar" aria-label="Çəkmə alətləri">
                            <button type="button" class="btn btn-sm btn-secondary active" data-drawing-tool="${id}" data-tool="freehand"><i class="fas fa-pencil"></i> Qələm</button>
                            <button type="button" class="btn btn-sm btn-secondary" data-drawing-tool="${id}" data-tool="line"><i class="fas fa-minus"></i> Xətt</button>
                            <button type="button" class="btn btn-sm btn-secondary" data-drawing-tool="${id}" data-tool="rect"><i class="far fa-square"></i> Dördbucaq</button>
                            <button type="button" class="btn btn-sm btn-secondary" data-drawing-tool="${id}" data-tool="ellipse"><i class="far fa-circle"></i> Dairə</button>
                            <button type="button" class="btn btn-sm btn-secondary" data-drawing-tool="${id}" data-tool="triangle"><i class="fas fa-draw-polygon"></i> Üçbucaq</button>
                            <button type="button" class="btn btn-sm btn-secondary" data-drawing-tool="${id}" data-tool="text"><i class="fas fa-font"></i> Yazı / ölçü</button>
                            <span class="figure-drawing-spacer"></span>
                            <button type="button" class="btn btn-sm btn-secondary" data-drawing-undo="${id}"><i class="fas fa-rotate-left"></i> Geri al</button>
                            <button type="button" class="btn btn-sm btn-secondary" data-drawing-clear="${id}"><i class="fas fa-trash"></i> Təmizlə</button>
                        </div>
                        <div class="figure-drawing-canvas-wrap"><canvas class="figure-drawing-canvas" data-drawing-canvas="${id}" width="640" height="360" aria-label="Fiqur çəkmə sahəsi"></canvas></div>
                        <p class="figure-drawing-hint">“Yazı / ölçü” alətini seçin, yuxarıya mətni yazın və lövhədə yerləşdirmək istədiyiniz nöqtəyə toxunun. Barmaqla da çəkmək mümkündür.</p>
                        <footer class="figure-drawing-footer">
                            <button type="button" class="btn btn-secondary" data-close-figure-drawing="${id}">Ləğv et</button>
                            <button type="button" class="btn btn-primary" data-apply-figure-drawing="${id}"><i class="fas fa-check"></i> Fiquru əlavə et</button>
                        </footer>
                    </section>
                </div>
            </div>`;
    }

    const drawingStates = new Map();
    const drawingWidth = 640;
    const drawingHeight = 360;

    function drawingState(id) {
        if (!drawingStates.has(id)) drawingStates.set(id, { items: [], draft: null, tool: 'freehand', title: '', baseSvg: '', baseImage: null, dirty: false });
        return drawingStates.get(id);
    }

    function drawingPoint(canvas, event) {
        const bounds = canvas.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(drawingWidth, (event.clientX - bounds.left) * drawingWidth / bounds.width)),
            y: Math.max(0, Math.min(drawingHeight, (event.clientY - bounds.top) * drawingHeight / bounds.height)),
        };
    }

    function drawItem(context, item, preview = false) {
        context.save();
        context.strokeStyle = item.color || '#2563eb';
        context.fillStyle = item.color || '#2563eb';
        context.lineWidth = item.width || 4;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        if (preview) context.setLineDash([6, 5]);
        if (item.type === 'text') {
            context.font = `600 ${item.width * 4 + 10}px Arial, sans-serif`;
            context.fillText(item.text, item.x, item.y);
        } else if (item.type === 'freehand' || item.type === 'line') {
            const points = item.points || [item.start, item.end].filter(Boolean);
            if (points.length) {
                context.beginPath();
                context.moveTo(points[0].x, points[0].y);
                points.slice(1).forEach(point => context.lineTo(point.x, point.y));
                context.stroke();
            }
        } else if (item.type === 'rect') {
            const x = Math.min(item.start.x, item.end.x);
            const y = Math.min(item.start.y, item.end.y);
            context.strokeRect(x, y, Math.abs(item.end.x - item.start.x), Math.abs(item.end.y - item.start.y));
        } else if (item.type === 'ellipse') {
            const x = (item.start.x + item.end.x) / 2;
            const y = (item.start.y + item.end.y) / 2;
            context.beginPath();
            context.ellipse(x, y, Math.abs(item.end.x - item.start.x) / 2, Math.abs(item.end.y - item.start.y) / 2, 0, 0, Math.PI * 2);
            context.stroke();
        } else if (item.type === 'triangle') {
            const left = Math.min(item.start.x, item.end.x);
            const right = Math.max(item.start.x, item.end.x);
            const top = Math.min(item.start.y, item.end.y);
            const bottom = Math.max(item.start.y, item.end.y);
            context.beginPath();
            context.moveTo((left + right) / 2, top);
            context.lineTo(left, bottom);
            context.lineTo(right, bottom);
            context.closePath();
            context.stroke();
        }
        context.restore();
    }

    function drawCanvas(id) {
        const canvas = document.querySelector(`[data-drawing-canvas="${id}"]`);
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const state = drawingState(id);
        context.clearRect(0, 0, drawingWidth, drawingHeight);
        context.fillStyle = '#fff';
        context.fillRect(0, 0, drawingWidth, drawingHeight);
        if (state.baseImage?.complete && state.baseImage.naturalWidth) {
            const scale = Math.min(drawingWidth / state.baseImage.naturalWidth, drawingHeight / state.baseImage.naturalHeight);
            const width = state.baseImage.naturalWidth * scale;
            const height = state.baseImage.naturalHeight * scale;
            context.drawImage(state.baseImage, (drawingWidth - width) / 2, (drawingHeight - height) / 2, width, height);
        }
        context.strokeStyle = '#e2e8f0';
        context.lineWidth = 1;
        context.setLineDash([4, 6]);
        context.strokeRect(12, 12, drawingWidth - 24, drawingHeight - 24);
        context.setLineDash([]);
        state.items.forEach(item => drawItem(context, item));
        if (state.draft) drawItem(context, state.draft, true);
    }

    function openDrawingEditor(id) {
        const modal = document.querySelector(`[data-figure-drawing="${id}"]`);
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        const state = drawingState(id);
        if (!state.dirty) {
            const current = readFigure(id);
            state.baseSvg = current?.type === 'svg' ? current.svg : current ? renderFigure(current) : '';
            state.baseImage = null;
            if (state.baseSvg) {
                const image = new Image();
                image.onload = () => {
                    state.baseImage = image;
                    drawCanvas(id);
                };
                image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.baseSvg)}`;
            }
        }
        state.title = modal.querySelector(`[data-drawing-title="${id}"]`)?.value || '';
        drawCanvas(id);
        modal.querySelector(`[data-drawing-title="${id}"]`)?.focus();
    }

    function closeDrawingEditor(id) {
        const modal = document.querySelector(`[data-figure-drawing="${id}"]`);
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    function drawingSvg(id) {
        const state = drawingState(id);
        const title = document.querySelector(`[data-drawing-title="${id}"]`)?.value.trim() || '';
        const escapeXml = value => escapeHtml(value);
        const elements = state.items.map(item => {
            const color = item.color || '#2563eb';
            const width = Math.max(1, Math.min(20, Number(item.width) || 4));
            if (item.type === 'text') {
                return `<text x="${item.x}" y="${item.y}" fill="${color}" font-size="${width * 4 + 10}" font-weight="bold">${escapeXml(item.text)}</text>`;
            }
            if (item.type === 'freehand') {
                const points = item.points || [];
                if (points.length < 2) return '';
                const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
                return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
            }
            if (item.type === 'line') {
                return `<line x1="${item.start.x.toFixed(1)}" y1="${item.start.y.toFixed(1)}" x2="${item.end.x.toFixed(1)}" y2="${item.end.y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
            }
            const left = Math.min(item.start.x, item.end.x);
            const right = Math.max(item.start.x, item.end.x);
            const top = Math.min(item.start.y, item.end.y);
            const bottom = Math.max(item.start.y, item.end.y);
            if (item.type === 'rect') return `<rect x="${left.toFixed(1)}" y="${top.toFixed(1)}" width="${(right - left).toFixed(1)}" height="${(bottom - top).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
            if (item.type === 'ellipse') return `<ellipse cx="${((left + right) / 2).toFixed(1)}" cy="${((top + bottom) / 2).toFixed(1)}" rx="${((right - left) / 2).toFixed(1)}" ry="${((bottom - top) / 2).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
            if (item.type === 'triangle') return `<polygon points="${((left + right) / 2).toFixed(1)},${top.toFixed(1)} ${left.toFixed(1)},${bottom.toFixed(1)} ${right.toFixed(1)},${bottom.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
            return '';
        }).filter(Boolean);
        if (title) elements.unshift(`<text x="320" y="28" fill="#1e293b" font-size="20" font-weight="bold" text-anchor="middle">${escapeXml(title)}</text>`);
        if (state.baseSvg) {
            const document = new DOMParser().parseFromString(state.baseSvg, 'image/svg+xml');
            if (document.documentElement.localName === 'svg' && !document.querySelector('parsererror')) {
                const baseViewBox = document.documentElement.getAttribute('viewBox') || `0 0 ${drawingWidth} ${drawingHeight}`;
                elements.unshift(`<svg x="0" y="0" width="${drawingWidth}" height="${drawingHeight}" viewBox="${escapeXml(baseViewBox)}">${document.documentElement.innerHTML}</svg>`);
            }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${drawingWidth}" height="${drawingHeight}" viewBox="0 0 ${drawingWidth} ${drawingHeight}">${elements.join('')}</svg>`;
    }

    function sanitizeSvgMarkup(markup) {
        if (typeof DOMParser !== 'function' || typeof XMLSerializer !== 'function') return '';
        const document = new DOMParser().parseFromString(String(markup || ''), 'image/svg+xml');
        const source = document.documentElement;
        if (source?.localName !== 'svg' || document.querySelector('parsererror')) return '';

        const allowedTags = new Set(['svg', 'g', 'path', 'polygon', 'polyline', 'line', 'circle', 'ellipse', 'rect', 'text', 'tspan']);
        const numericAttributes = new Set(['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'stroke-width', 'font-size', 'opacity']);
        const colorAttributes = new Set(['fill', 'stroke']);
        const safeColor = value => /^(?:#[0-9a-f]{3,8}|none|transparent|black|white|red|green|blue|gray|grey|orange|purple|yellow|currentcolor)$/i.test(value);
        const safeNumbers = value => /^-?(?:\d+\.?\d*|\.\d+)(?:[ ,]+-?(?:\d+\.?\d*|\.\d+))*$/.test(value);
        const safeAttribute = (name, value) => {
            const normalized = value.trim();
            if (colorAttributes.has(name)) return safeColor(normalized);
            if (numericAttributes.has(name)) return name === 'opacity'
                ? Number.isFinite(Number(normalized)) && Number(normalized) >= 0 && Number(normalized) <= 1
                : safeNumbers(normalized);
            if (name === 'viewBox' || name === 'points') return safeNumbers(normalized);
            if (name === 'd') return /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/.test(normalized);
            if (name === 'stroke-dasharray') return /^(?:none|[\d.,\s]+)$/.test(normalized);
            if (name === 'font-weight') return /^(?:normal|bold|[1-9]00)$/.test(normalized);
            if (name === 'text-anchor') return /^(?:start|middle|end)$/.test(normalized);
            return false;
        };
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('class', 'geometry-diagram');
        const width = Number.parseFloat(source.getAttribute('width'));
        const height = Number.parseFloat(source.getAttribute('height'));
        svg.setAttribute('width', String(Number.isFinite(width) && width > 0 && width <= 800 ? width : 320));
        svg.setAttribute('height', String(Number.isFinite(height) && height > 0 && height <= 800 ? height : 210));
        const viewBox = source.getAttribute('viewBox') || source.getAttribute('viewbox');
        if (viewBox && safeAttribute('viewBox', viewBox)) svg.setAttribute('viewBox', viewBox.trim());

        const copyChildren = (sourceNode, targetNode) => {
            for (const child of sourceNode.childNodes) {
                if (child.nodeType === 3) {
                    targetNode.appendChild(document.createTextNode(child.nodeValue || ''));
                    continue;
                }
                if (child.nodeType !== 1 || !allowedTags.has(child.localName)) continue;
                const element = document.createElementNS('http://www.w3.org/2000/svg', child.localName);
                const safeStyles = [];
                for (const attribute of child.attributes) {
                    if (!safeAttribute(attribute.name, attribute.value)) continue;
                    const value = attribute.value.trim();
                    element.setAttribute(attribute.name, value);
                    if (['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-weight', 'text-anchor'].includes(attribute.name)) {
                        safeStyles.push(`${attribute.name}:${value}`);
                    }
                }
                if (safeStyles.length) element.setAttribute('style', safeStyles.join(';'));
                copyChildren(child, element);
                targetNode.appendChild(element);
            }
        };
        copyChildren(source, svg);
        return new XMLSerializer().serializeToString(svg);
    }

    function normalizeFigure(raw) {
        if (raw?.type === 'svg') {
            const svg = sanitizeSvgMarkup(raw.svg);
            return svg ? { type: 'svg', svg } : null;
        }
        if (!raw || !shapes.some(([value]) => value === raw.type)) return null;
        return {
            type: raw.type,
            vertices: String(raw.vertices || '').slice(0, 24),
            measure: String(raw.measure || '').slice(0, 24),
        };
    }

    function readFigure(id) {
        const type = document.getElementById(`${id}_shape`)?.value || '';
        if (!type) {
            const svg = document.getElementById(`${id}_svg`)?.value || '';
            return svg ? normalizeFigure({ type: 'svg', svg }) : null;
        }
        return normalizeFigure({
            type,
            vertices: document.getElementById(`${id}_vertices`)?.value || '',
            measure: document.getElementById(`${id}_measure`)?.value || '',
        });
    }

    function renderFigure(raw) {
        const figure = normalizeFigure(raw);
        if (!figure) return '';
        if (figure.type === 'svg') {
            const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(figure.svg)}`;
            return `<img class="geometry-diagram" src="${source}" alt="Sualın həndəsi fiquru" loading="lazy">`;
        }
        const labels = figure.vertices.split(',').map(value => value.trim()).filter(Boolean);
        const vertex = (text, x, y) => `<text x="${x}" y="${y}" class="diagram-label">${escapeHtml(text)}</text>`;
        const mark = figure.measure ? `<text x="160" y="186" class="diagram-measure">${escapeHtml(figure.measure)}</text>` : '';
        let drawing = '';
        switch (figure.type) {
            case 'triangle':
                drawing = `<path d="M160 28 L48 172 L272 172 Z"/>${vertex(labels[0] || 'A', 150, 20)}${vertex(labels[1] || 'B', 30, 188)}${vertex(labels[2] || 'C', 278, 188)}`;
                break;
            case 'rightTriangle':
                drawing = `<path d="M55 170 L55 48 L270 170 Z"/><path d="M55 150 L75 150 L75 170"/>${vertex(labels[0] || 'A', 38, 44)}${vertex(labels[1] || 'B', 38, 190)}${vertex(labels[2] || 'C', 278, 188)}`;
                break;
            case 'square':
                drawing = `<path d="M82 48 H238 V170 H82 Z"/>${vertex(labels[0] || 'A', 70, 42)}${vertex(labels[1] || 'B', 242, 42)}${vertex(labels[2] || 'C', 242, 190)}${vertex(labels[3] || 'D', 67, 190)}`;
                break;
            case 'rectangle':
                drawing = `<path d="M48 65 H272 V158 H48 Z"/>${vertex(labels[0] || 'A', 35, 60)}${vertex(labels[1] || 'B', 276, 60)}${vertex(labels[2] || 'C', 276, 178)}${vertex(labels[3] || 'D', 34, 178)}`;
                break;
            case 'circle':
                drawing = `<circle cx="160" cy="108" r="68"/><path d="M160 108 L218 73"/><circle cx="160" cy="108" r="3" class="diagram-dot"/>${vertex(labels[0] || 'O', 148, 128)}${vertex(labels[1] || 'A', 222, 72)}`;
                break;
            case 'parallelogram':
                drawing = `<path d="M100 48 H270 L220 170 H50 Z"/>${vertex(labels[0] || 'A', 85, 42)}${vertex(labels[1] || 'B', 275, 42)}${vertex(labels[2] || 'C', 224, 190)}${vertex(labels[3] || 'D', 34, 190)}`;
                break;
        }
        return `<svg class="geometry-diagram" viewBox="0 0 320 210" role="img" aria-label="${escapeHtml(shapes.find(([value]) => value === figure.type)?.[1] || 'Həndəsi fiqur')}">${drawing}${mark}</svg>`;
    }

    function refreshPreview(id) {
        const preview = document.getElementById(`${id}_figurePreview`);
        if (preview) preview.innerHTML = renderFigure(readFigure(id));
    }

    function setImportedFigure(id, rawFigure) {
        const figure = normalizeFigure(rawFigure);
        drawingStates.set(id, { items: [], draft: null, tool: 'freehand', title: '', baseSvg: '', baseImage: null, dirty: false });
        const shape = document.getElementById(`${id}_shape`);
        const svg = document.getElementById(`${id}_svg`);
        if (shape) shape.value = figure && figure.type !== 'svg' ? figure.type : '';
        if (svg) svg.value = figure?.type === 'svg' ? figure.svg : '';
        refreshPreview(id);
    }

    function insertSymbol(inputId, symbol) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const placeholderIndex = symbol.indexOf('□');
        const insertion = `$${placeholderIndex >= 0 ? symbol.replace(/□/g, '') : symbol}$`;
        input.value = `${input.value.slice(0, start)}${insertion}${input.value.slice(end)}`;
        input.focus();
        const cursor = start + (placeholderIndex >= 0 ? placeholderIndex + 1 : insertion.length);
        input.setSelectionRange(cursor, cursor);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function updatePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!input || !preview) return;
        const value = input.value.trim();
        preview.textContent = value;
        preview.classList.toggle('active', Boolean(value));
        if (value && typeof window.renderMathInElement === 'function') {
            window.renderMathInElement(preview, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                ],
                throwOnError: false,
            });
        }
    }

    function answerEditorMarkup(id, initial = {}) {
        const type = ['single-choice', 'multiple-choice', 'true-false', 'short-answer', 'numeric'].includes(initial.type)
            ? initial.type
            : 'single-choice';
        const options = Array.isArray(initial.options) ? initial.options : ['', '', '', ''];
        const correct = initial.correctAnswer ?? 0;
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        let fields = '';
        if (type === 'single-choice' || type === 'multiple-choice') {
            fields = (type === 'single-choice' ? options.slice(0, 6) : options.slice(0, 6)).map((value, index) => `
                <div class="question-answer-choice">
                    <label class="question-answer-option">
                        <input type="${type === 'single-choice' ? 'radio' : 'checkbox'}" name="${id}_correct" value="${index}"
                            ${type === 'single-choice' ? (Number(correct) === index ? 'checked' : '') : (Array.isArray(correct) && correct.includes(index) ? 'checked' : '')}>
                        <span>${letters[index]})</span>
                        <input id="${id}_option_${index}" type="text" class="form-control" data-answer-option="${id}" data-index="${index}" value="${escapeHtml(value)}" placeholder="${letters[index]} variantı" ${index < 2 ? 'required' : ''}>
                    </label>
                    ${toolbarMarkup(`${id}_option_${index}`)}
                    ${index >= 2 ? `<button type="button" class="btn btn-sm btn-secondary" data-remove-answer-option="${id}" data-index="${index}" aria-label="${letters[index]} variantını sil">Variantı sil</button>` : ''}
                </div>`).join('');
            if (options.length < 6) fields += `<button type="button" class="btn btn-sm btn-secondary" data-add-answer-option="${id}">+ Variant əlavə et</button>`;
        } else if (type === 'true-false') {
            fields = ['Doğru', 'Yanlış'].map((value, index) => `
                <label class="question-answer-option">
                    <input type="radio" name="${id}_correct" value="${index}" ${Number(correct) === index ? 'checked' : ''}>
                    <span>${value}</span>
                </label>`).join('');
        } else {
            fields = `<label class="question-answer-key">
                <span>${type === 'numeric' ? 'Düzgün ədədi cavab' : 'Düzgün cavab mətni'}</span>
                <input type="${type === 'numeric' ? 'number' : 'text'}" step="any" class="form-control" data-answer-key="${id}" value="${escapeHtml(correct ?? '')}" required>
            </label>
            ${type === 'numeric' ? `<label class="question-answer-key">
                <span>Qəbul edilən xəta (istəyə bağlı)</span>
                <input type="number" min="0" step="any" class="form-control" data-answer-tolerance="${id}" value="${escapeHtml(initial.answerTolerance ?? 0)}">
            </label>` : ''}`;
        }
        return `<div class="question-answer-editor" data-answer-editor="${id}">
            <label class="question-type-label">Sual növü
                <select class="form-control" data-question-type="${id}">
                    <option value="single-choice" ${type === 'single-choice' ? 'selected' : ''}>Bir düzgün cavab</option>
                    <option value="multiple-choice" ${type === 'multiple-choice' ? 'selected' : ''}>Bir neçə düzgün cavab</option>
                    <option value="true-false" ${type === 'true-false' ? 'selected' : ''}>Doğru / yanlış</option>
                    <option value="short-answer" ${type === 'short-answer' ? 'selected' : ''}>Qısa mətn cavabı</option>
                    <option value="numeric" ${type === 'numeric' ? 'selected' : ''}>Ədədi cavab</option>
                </select>
            </label>
            <div class="question-answer-fields">${fields}</div>
        </div>`;
    }

    function readAnswer(id) {
        const type = document.querySelector(`[data-question-type="${id}"]`)?.value || 'single-choice';
        const checked = [...document.querySelectorAll(`[data-answer-editor="${id}"] input[name="${id}_correct"]:checked`)];
        if (type === 'single-choice') {
            return {
                type,
                options: [...document.querySelectorAll(`[data-answer-option="${id}"]`)].map(input => input.value.trim()),
                correctAnswer: Number(checked[0]?.value ?? 0),
            };
        }
        if (type === 'multiple-choice') {
            return {
                type,
                options: [...document.querySelectorAll(`[data-answer-option="${id}"]`)].map(input => input.value.trim()),
                correctAnswer: checked.map(input => Number(input.value)),
            };
        }
        if (type === 'true-false') {
            return { type, options: ['Doğru', 'Yanlış'], correctAnswer: Number(checked[0]?.value ?? 0) };
        }
        if (type === 'numeric') {
            const rawAnswer = document.querySelector(`[data-answer-key="${id}"]`)?.value.trim() || '';
            return {
                type,
                options: [],
                correctAnswer: rawAnswer === '' ? Number.NaN : Number(rawAnswer),
                answerTolerance: Math.max(0, Number(document.querySelector(`[data-answer-tolerance="${id}"]`)?.value) || 0),
            };
        }
        return {
            type: 'short-answer',
            options: [],
            correctAnswer: document.querySelector(`[data-answer-key="${id}"]`)?.value.trim() || '',
        };
    }

    function renderQuestionAnswer(raw) {
        const type = raw?.type || 'single-choice';
        if (type === 'short-answer') return `<div class="question-answer-preview">Qısa cavab · düzgün cavab: ${escapeHtml(raw.correctAnswer || '')}</div>`;
        if (type === 'numeric') return `<div class="question-answer-preview">Ədədi cavab · düzgün cavab: ${escapeHtml(raw.correctAnswer ?? '')}${Number(raw.answerTolerance) ? ` · ±${escapeHtml(raw.answerTolerance)}` : ''}</div>`;
        const options = type === 'true-false' ? ['Doğru', 'Yanlış'] : (raw.options || []);
        const correctAnswers = Array.isArray(raw.correctAnswer) ? raw.correctAnswer : [Number(raw.correctAnswer)];
        return `<div class="options-grid">${options.map((option, index) =>
            `<div class="opt-display ${correctAnswers.includes(index) ? 'correct' : ''}">${escapeHtml(option)}${correctAnswers.includes(index) ? ' ✓' : ''}</div>`
        ).join('')}</div>`;
    }

    function updateAnswerEditor(id, type) {
        const editor = document.querySelector(`[data-answer-editor="${id}"]`);
        if (!editor) return;
        const existingOptions = [...editor.querySelectorAll(`[data-answer-option="${id}"]`)].map(input => input.value);
        const selected = [...editor.querySelectorAll(`input[name="${id}_correct"]:checked`)].map(input => Number(input.value));
        const currentType = editor.querySelector(`[data-question-type="${id}"]`)?.value || 'single-choice';
        const answerInput = editor.querySelector(`[data-answer-key="${id}"]`);
        const answer = {
            type,
            options: existingOptions.length ? existingOptions : ['', '', '', ''],
            correctAnswer: type === 'multiple-choice'
                ? (currentType === 'multiple-choice' ? selected : selected.slice(0, 1))
                : (selected[0] ?? 0),
        };
        if (type === 'short-answer' || type === 'numeric') {
            answer.correctAnswer = answerInput?.value || '';
            answer.answerTolerance = editor.querySelector(`[data-answer-tolerance="${id}"]`)?.value || 0;
        }
        editor.outerHTML = answerEditorMarkup(id, answer);
    }

    function parseQuestionCsv(text) {
        const source = String(text || '').replace(/^\uFEFF/, '');
        const firstLine = source.split(/\r?\n/, 1)[0] || '';
        let delimiter = ',';
        let quote = false;
        let commaCount = 0;
        let semicolonCount = 0;
        for (let index = 0; index < firstLine.length; index += 1) {
            if (firstLine[index] === '"') {
                if (quote && firstLine[index + 1] === '"') index += 1;
                else quote = !quote;
            } else if (!quote && firstLine[index] === ',') commaCount += 1;
            else if (!quote && firstLine[index] === ';') semicolonCount += 1;
        }
        if (semicolonCount > commaCount) delimiter = ';';

        const rows = [];
        let row = [];
        let cell = '';
        quote = false;
        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];
            if (char === '"') {
                if (quote && source[index + 1] === '"') {
                    cell += '"';
                    index += 1;
                } else quote = !quote;
            } else if (!quote && char === delimiter) {
                row.push(cell);
                cell = '';
            } else if (!quote && (char === '\n' || char === '\r')) {
                if (char === '\r' && source[index + 1] === '\n') index += 1;
                row.push(cell);
                if (row.some(value => value.trim())) rows.push(row);
                row = [];
                cell = '';
            } else cell += char;
        }
        if (quote) throw new Error('CSV faylında bağlanmamış dırnaq işarəsi var.');
        row.push(cell);
        if (row.some(value => value.trim())) rows.push(row);
        if (rows.length < 2) throw new Error('CSV faylında başlıq və ən azı bir sual olmalıdır.');

        const headers = rows.shift().map(value => value.trim().toLocaleLowerCase('az'));
        const column = (...names) => headers.findIndex(header => names.includes(header));
        const questionColumn = column('question', 'sual');
        const typeColumn = column('type', 'növ', 'nov');
        const optionsColumn = column('options', 'variantlar', 'cavab variantları');
        const correctColumn = column('correctanswer', 'correct answer', 'düzgün cavab', 'duzgun cavab');
        const explanationColumn = column('explanation', 'izah', 'həll');
        const toleranceColumn = column('answertolerance', 'tolerance', 'qəbul edilən xəta');
        if (questionColumn < 0 || correctColumn < 0) {
            throw new Error('CSV başlığında question və correctAnswer sütunları olmalıdır.');
        }

        if (rows.length > 200) throw new Error('CSV faylı ən çox 200 sual daşıya bilər.');
        return rows.map((cells, index) => {
            const rowNumber = index + 2;
            const value = columnIndex => columnIndex < 0 ? '' : String(cells[columnIndex] || '').trim();
            let question = value(questionColumn);
            const svgMatches = question.match(/<svg\b[\s\S]*?<\/svg\s*>/gi) || [];
            if (svgMatches.length > 1) throw new Error(`${rowNumber}-ci sətirdə yalnız bir SVG fiqur ola bilər.`);
            let figure = null;
            if (svgMatches.length) {
                const svg = sanitizeSvgMarkup(svgMatches[0]);
                if (!svg) throw new Error(`${rowNumber}-ci sətirdə SVG fiqur formatı düzgün deyil.`);
                figure = { type: 'svg', svg };
                question = question.replace(svgMatches[0], '').replace(/<br\s*\/?>/gi, '\n');
                question = new DOMParser().parseFromString(question, 'text/html').body.textContent.trim();
            }
            const type = value(typeColumn) || 'single-choice';
            if (!question) throw new Error(`${rowNumber}-ci sətirdə sual mətni boşdur.`);
            if (!['single-choice', 'multiple-choice', 'true-false', 'short-answer', 'numeric'].includes(type)) {
                throw new Error(`${rowNumber}-ci sətirdə sual növü düzgün deyil.`);
            }
            const options = value(optionsColumn) ? value(optionsColumn).split('|').map(item => item.trim()) : [];
            const correctRaw = value(correctColumn);
            const answerIndex = item => {
                const letterIndex = ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(item.toUpperCase());
                return letterIndex >= 0 ? letterIndex : Number(item);
            };
            let correctAnswer;
            if (type === 'multiple-choice') correctAnswer = correctRaw.split('|').map(item => answerIndex(item.trim()));
            else if (type === 'single-choice') correctAnswer = answerIndex(correctRaw);
            else if (type === 'true-false') {
                const normalized = correctRaw.toLocaleLowerCase('az');
                correctAnswer = ['doğru', 'dogru', 'true'].includes(normalized) ? 0
                    : ['yanlış', 'yalnish', 'false'].includes(normalized) ? 1
                    : Number(correctRaw);
            } else if (type === 'numeric') correctAnswer = Number(correctRaw.replace(',', '.'));
            else correctAnswer = correctRaw.split('|').map(item => item.trim()).filter(Boolean);

            const toleranceRaw = value(toleranceColumn);
            const answerTolerance = toleranceRaw ? Number(toleranceRaw.replace(',', '.')) : 0;
            if (['single-choice', 'multiple-choice'].includes(type)) {
                if (options.length < 2 || options.length > 6 || options.some(option => !option)) {
                    throw new Error(`${rowNumber}-ci sətirdə 2–6 arası cavab variantı yazın (| ilə ayırın).`);
                }
                const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
                if (!correctAnswers.length || correctAnswers.some(answer => !Number.isInteger(answer) || answer < 0 || answer >= options.length)
                    || (type === 'multiple-choice' && new Set(correctAnswers).size !== correctAnswers.length)) {
                    throw new Error(`${rowNumber}-ci sətirdə düzgün cavab indeksini/indekslərini yoxlayın (A-F və ya 0-dan başlayan rəqəmlər).`);
                }
            } else if (type === 'true-false' && (!correctRaw || ![0, 1].includes(correctAnswer))) {
                throw new Error(`${rowNumber}-ci sətirdə doğru/yanlış cavabı yazın.`);
            } else if (type === 'short-answer' && (!correctAnswer.length || correctAnswer.some(answer => !answer))) {
                throw new Error(`${rowNumber}-ci sətirdə düzgün qısa cavabı yazın.`);
            } else if (type === 'numeric' && (!Number.isFinite(correctAnswer) || !Number.isFinite(answerTolerance) || answerTolerance < 0)) {
                throw new Error(`${rowNumber}-ci sətirdə ədədi cavab və qəbul edilən xətanı yoxlayın.`);
            }

            return {
                question,
                type,
                options: type === 'true-false' || type === 'short-answer' || type === 'numeric' ? [] : options,
                correctAnswer: type === 'short-answer' ? correctAnswer : correctAnswer,
                ...(type === 'numeric' ? { answerTolerance } : {}),
                explanation: value(explanationColumn),
                figure,
            };
        });
    }

    function downloadQuestionCsvTemplate() {
        const csv = [
            'question,type,options,correctAnswer,explanation,answerTolerance',
            '"$3x+7=19$ tənliyində x-i tapın",single-choice,"2|3|4|5",C,"3x=12, x=4",',
            '"Hansı ədədlər cütdür?",multiple-choice,"2|3|4|5","A|C","2 və 4 cüt ədədlərdir",',
            '"Üçbucağın bucaqlarının cəmi 180°-dir",true-false,,Doğru,"",',
            '"$2x=10$ tənliyini həll edin",numeric,,5,"Hər iki tərəfi 2-yə bölün",0',
            '"$\\sqrt{49}$ neçədir?",short-answer,,7,"7²=49",',
        ].join('\r\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'riyaziyyat-sual-sablonu.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    document.addEventListener('click', event => {
        const openDrawing = event.target.closest('[data-open-figure-drawing]');
        if (openDrawing) {
            openDrawingEditor(openDrawing.dataset.openFigureDrawing);
            return;
        }
        const closeDrawing = event.target.closest('[data-close-figure-drawing]');
        if (closeDrawing) {
            closeDrawingEditor(closeDrawing.dataset.closeFigureDrawing);
            return;
        }
        const toolButton = event.target.closest('[data-drawing-tool]');
        if (toolButton) {
            const id = toolButton.dataset.drawingTool;
            const state = drawingState(id);
            state.tool = toolButton.dataset.tool;
            document.querySelectorAll(`[data-drawing-tool="${id}"]`).forEach(button => button.classList.toggle('active', button === toolButton));
            return;
        }
        const undoDrawing = event.target.closest('[data-drawing-undo]');
        if (undoDrawing) {
            const state = drawingState(undoDrawing.dataset.drawingUndo);
            state.items.pop();
            state.dirty = true;
            drawCanvas(undoDrawing.dataset.drawingUndo);
            return;
        }
        const clearDrawing = event.target.closest('[data-drawing-clear]');
        if (clearDrawing) {
            const id = clearDrawing.dataset.drawingClear;
            const state = drawingState(id);
            state.items = [];
            state.draft = null;
            state.baseSvg = '';
            state.baseImage = null;
            state.dirty = true;
            drawCanvas(id);
            return;
        }
        const applyDrawing = event.target.closest('[data-apply-figure-drawing]');
        if (applyDrawing) {
            const id = applyDrawing.dataset.applyFigureDrawing;
            const state = drawingState(id);
            if (!state.items.length && !state.baseSvg) {
                window.showNotification?.('Əvvəlcə lövhədə fiqur çəkin və ya ən azı bir yazı yerləşdirin.', 'warning');
                return;
            }
            const svg = normalizeFigure({ type: 'svg', svg: drawingSvg(id) })?.svg;
            if (!svg) {
                window.showNotification?.('Fiquru yadda saxlamaq mümkün olmadı. Yenidən cəhd edin.', 'error');
                return;
            }
            if (svg.length > 200000) {
                window.showNotification?.('Fiqur çox böyükdür. Daha az xətt və yazı ilə yenidən çəkin.', 'warning');
                return;
            }
            const shape = document.getElementById(`${id}_shape`);
            const hidden = document.getElementById(`${id}_svg`);
            if (shape) shape.value = '';
            if (hidden) hidden.value = svg;
            refreshPreview(id);
            closeDrawingEditor(id);
            return;
        }
        const drawingModal = event.target.closest('.figure-drawing-modal.active');
        if (drawingModal && event.target === drawingModal) {
            closeDrawingEditor(drawingModal.dataset.figureDrawing);
            return;
        }
        const symbolButton = event.target.closest('[data-math-target][data-math-symbol]');
        if (symbolButton) {
            insertSymbol(symbolButton.dataset.mathTarget, symbolButton.dataset.mathSymbol);
            return;
        }
        const clearButton = event.target.closest('[data-clear-figure]');
        if (clearButton) {
            const id = clearButton.dataset.clearFigure;
            const shape = document.getElementById(`${id}_shape`);
            if (shape) shape.value = '';
            const svg = document.getElementById(`${id}_svg`);
            if (svg) svg.value = '';
            refreshPreview(id);
        }
        const addOption = event.target.closest('[data-add-answer-option]');
        if (addOption) {
            const id = addOption.dataset.addAnswerOption;
            const editor = document.querySelector(`[data-answer-editor="${id}"]`);
            const answer = readAnswer(id);
            const options = answer.options;
            if (options.length >= 6) return;
            options.push('');
            editor.outerHTML = answerEditorMarkup(id, { ...answer, options });
            return;
        }
        const removeOption = event.target.closest('[data-remove-answer-option]');
        if (removeOption) {
            const id = removeOption.dataset.removeAnswerOption;
            const editor = document.querySelector(`[data-answer-editor="${id}"]`);
            const answer = readAnswer(id);
            const options = answer.options;
            if (options.length <= 2) return;
            const removedIndex = Number(removeOption.dataset.index);
            options.splice(removedIndex, 1);
            const correctAnswer = Array.isArray(answer.correctAnswer)
                ? answer.correctAnswer.filter(index => index !== removedIndex).map(index => index > removedIndex ? index - 1 : index)
                : answer.correctAnswer === removedIndex ? 0 : answer.correctAnswer > removedIndex ? answer.correctAnswer - 1 : answer.correctAnswer;
            editor.outerHTML = answerEditorMarkup(id, { ...answer, options, correctAnswer });
        }
    });
    document.addEventListener('pointerdown', event => {
        const canvas = event.target.closest('[data-drawing-canvas]');
        if (!canvas) return;
        const id = canvas.dataset.drawingCanvas;
        const state = drawingState(id);
        const point = drawingPoint(canvas, event);
        state.dirty = true;
        if (state.tool === 'text') {
            if (state.items.length >= 100) {
                window.showNotification?.('Lövhədə maksimum 100 element yerləşdirmək olar.', 'warning');
                return;
            }
            const input = document.querySelector(`[data-drawing-label="${id}"]`);
            const text = input?.value.trim() || window.prompt('Fiqurun nöqtə adını və ya ölçüsünü daxil edin:') || '';
            if (!text) return;
            state.items.push({ type: 'text', x: point.x, y: point.y, text: text.slice(0, 40), color: document.querySelector(`[data-drawing-color="${id}"]`)?.value || '#2563eb', width: Number(document.querySelector(`[data-drawing-width="${id}"]`)?.value) || 4 });
            if (input) input.value = '';
            drawCanvas(id);
            return;
        }
        if (state.items.length >= 100) {
            window.showNotification?.('Lövhədə maksimum 100 element yerləşdirmək olar.', 'warning');
            return;
        }
        const color = document.querySelector(`[data-drawing-color="${id}"]`)?.value || '#2563eb';
        const width = Number(document.querySelector(`[data-drawing-width="${id}"]`)?.value) || 4;
        state.draft = state.tool === 'freehand'
            ? { type: 'freehand', points: [point], color, width }
            : { type: state.tool, start: point, end: point, color, width };
        canvas.setPointerCapture(event.pointerId);
    });
    document.addEventListener('pointermove', event => {
        const canvas = event.target.closest('[data-drawing-canvas]');
        if (!canvas) return;
        const state = drawingState(canvas.dataset.drawingCanvas);
        if (!state.draft) return;
        const point = drawingPoint(canvas, event);
        if (state.draft.type === 'freehand' && state.draft.points.length < 500) state.draft.points.push(point);
        else state.draft.end = point;
        drawCanvas(canvas.dataset.drawingCanvas);
    });
    document.addEventListener('pointerup', event => {
        const canvas = event.target.closest('[data-drawing-canvas]');
        if (!canvas) return;
        const state = drawingState(canvas.dataset.drawingCanvas);
        if (!state.draft) return;
        if (state.draft.type === 'freehand' && state.draft.points.length === 1) {
            state.draft.points.push({ ...state.draft.points[0], x: state.draft.points[0].x + 0.1 });
        }
        state.items.push(state.draft);
        state.draft = null;
        drawCanvas(canvas.dataset.drawingCanvas);
    });
    document.addEventListener('input', event => {
        const title = event.target.closest('[data-drawing-title]');
        if (title) drawingState(title.dataset.drawingTitle).title = title.value;
    });
    document.addEventListener('input', event => {
        const field = event.target.closest('[data-figure-field]');
        if (field) refreshPreview(field.dataset.figureField);
    });
    document.addEventListener('change', event => {
        const field = event.target.closest('[data-figure-field]');
        if (field) {
            const svg = document.getElementById(`${field.dataset.figureField}_svg`);
            if (svg) svg.value = '';
            if (field.dataset.field === 'type') {
                drawingStates.set(field.dataset.figureField, { items: [], draft: null, tool: 'freehand', title: '', baseSvg: '', baseImage: null, dirty: false });
            }
            refreshPreview(field.dataset.figureField);
        }
        const typeSelect = event.target.closest('[data-question-type]');
        if (typeSelect) updateAnswerEditor(typeSelect.dataset.questionType, typeSelect.value);
    });

    window.MathQuestionTools = {
        editorMarkup, toolbarMarkup, readFigure, renderFigure, normalizeFigure, refreshPreview,
        updatePreview, escapeHtml, answerEditorMarkup, readAnswer, renderQuestionAnswer, sanitizeSvgMarkup, setImportedFigure,
        parseQuestionCsv, downloadQuestionCsvTemplate,
    };
})();
