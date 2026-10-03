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
                <details class="geometry-editor">
                    <summary><i class="fas fa-draw-polygon"></i> Həndəsi fiqur əlavə et</summary>
                    <div class="geometry-fields">
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
                    <div class="geometry-preview" id="${id}_figurePreview" aria-live="polite"></div>
                </details>
            </div>`;
    }

    function normalizeFigure(raw) {
        if (!raw || !shapes.some(([value]) => value === raw.type)) return null;
        return {
            type: raw.type,
            vertices: String(raw.vertices || '').slice(0, 24),
            measure: String(raw.measure || '').slice(0, 24),
        };
    }

    function readFigure(id) {
        const type = document.getElementById(`${id}_shape`)?.value || '';
        if (!type) return null;
        return normalizeFigure({
            type,
            vertices: document.getElementById(`${id}_vertices`)?.value || '',
            measure: document.getElementById(`${id}_measure`)?.value || '',
        });
    }

    function renderFigure(raw) {
        const figure = normalizeFigure(raw);
        if (!figure) return '';
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

    document.addEventListener('click', event => {
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
            refreshPreview(id);
        }
    });
    document.addEventListener('input', event => {
        const field = event.target.closest('[data-figure-field]');
        if (field) refreshPreview(field.dataset.figureField);
    });
    document.addEventListener('change', event => {
        const field = event.target.closest('[data-figure-field]');
        if (field) refreshPreview(field.dataset.figureField);
    });

    window.MathQuestionTools = { editorMarkup, toolbarMarkup, readFigure, renderFigure, normalizeFigure, refreshPreview, updatePreview };
})();
