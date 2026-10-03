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
            const question = value(questionColumn);
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
    document.addEventListener('input', event => {
        const field = event.target.closest('[data-figure-field]');
        if (field) refreshPreview(field.dataset.figureField);
    });
    document.addEventListener('change', event => {
        const field = event.target.closest('[data-figure-field]');
        if (field) refreshPreview(field.dataset.figureField);
        const typeSelect = event.target.closest('[data-question-type]');
        if (typeSelect) updateAnswerEditor(typeSelect.dataset.questionType, typeSelect.value);
    });

    window.MathQuestionTools = {
        editorMarkup, toolbarMarkup, readFigure, renderFigure, normalizeFigure, refreshPreview,
        updatePreview, escapeHtml, answerEditorMarkup, readAnswer, renderQuestionAnswer,
        parseQuestionCsv, downloadQuestionCsvTemplate,
    };
})();
