(function () {
    'use strict';

    const gradeTopics = {
        '1': ['Ədədlər və sayma', 'Toplama və çıxma', 'Sadə məsələlər', 'Ölçmə və kəmiyyətlər', 'Həndəsi fiqurlar', 'Məntiq və ardıcıllıqlar'],
        '2': ['Ədədlər və mərtəbələr', 'Toplama və çıxma', 'Vurma və bölməyə giriş', 'Mətnli məsələlər', 'Kəsrlərə giriş', 'Uzunluq, kütlə və zaman', 'Perimetr və fiqurlar', 'Məntiq və ardıcıllıqlar'],
        '3': ['Natural ədədlər və mərtəbələr', 'Dörd hesab əməli', 'Vurma və bölmə', 'Mətnli və çoxaddımlı məsələlər', 'Kəsrlər', 'Ölçü vahidləri və çevirmələr', 'Perimetr və sahə', 'Həndəsi fiqurlar', 'Cədvəl və diaqramlar'],
        '4': ['Çoxrəqəmli ədədlər', 'Dörd hesab əməli və əməl sırası', 'Qalıqlı bölmə', 'Kəsrlər və onluq kəsrlər', 'Tənliklər və ifadələr', 'Mətnli məsələlər', 'Ölçü vahidləri', 'Perimetr, sahə və həcm', 'Bucaqlar və çoxbucaqlılar', 'Cədvəl və diaqramlar'],
        '5': ['Natural ədədlər və bölünmə', 'Adi kəsrlər', 'Onluq kəsrlər', 'Faizlərə giriş', 'Ədədi ifadələr və tənliklər', 'Mətnli məsələlər', 'Ölçü vahidləri', 'Bucaqlar və çoxbucaqlılar', 'Perimetr, sahə və həcm', 'Koordinat və məlumatlar'],
        '6': ['Tam və rasional ədədlər', 'Adi və onluq kəsrlər', 'Nisbət, tənasüb və faiz', 'Ədədi və cəbri ifadələr', 'Tənliklər və məsələlər', 'Koordinat sistemi və qrafiklər', 'Bucaqlar və çoxbucaqlılar', 'Sahə və həcm', 'Statistika və ehtimal'],
        '7': ['Rasional ədədlər və qüvvətlər', 'Cəbri ifadələr və çoxhədlilər', 'Xətti tənliklər və bərabərsizliklər', 'Nisbət, tənasüb və faiz', 'Funksiyalar və qrafiklər', 'Bucaqlar və paralel düz xətlər', 'Üçbucaqlar və dördbucaqlılar', 'Çevrə və dairə', 'Statistika və ehtimal'],
        '8': ['Həqiqi ədədlər və kvadrat kök', 'Rasional ifadələr', 'Çoxhədlilər və vuruqlara ayırma', 'Xətti tənliklər sistemi', 'Kvadrat tənliklərə giriş', 'Funksiyalar və qrafiklər', 'Oxşarlıq və konqruentlik', 'Dördbucaqlılar və çoxbucaqlılar', 'Çevrə və dairə', 'Statistika və ehtimal'],
        '9': ['Həqiqi ədədlər, qüvvət və köklər', 'Kvadrat tənliklər və bərabərsizliklər', 'Tənliklər və tənliklər sistemləri', 'Ardıcıllıqlar və silsilələr', 'Funksiyalar və qrafiklər', 'Triqonometriyanın əsasları', 'Koordinat həndəsəsi və vektorlar', 'Çoxüzlülər və fırlanma cisimləri', 'Kombinatorika, statistika və ehtimal'],
        '10': ['İfadələrin çevrilmələri', 'Tənliklər, bərabərsizliklər və sistemlər', 'Funksiyalar və çevrilmələr', 'Üstlü və loqarifmik ifadələr', 'Triqonometrik funksiyalar və tənliklər', 'Ardıcıllıqlar və silsilələr', 'Vektorlar və koordinat üsulu', 'Stereometriya və fəza fiqurları', 'Kombinatorika və ehtimal'],
        '11': ['Funksiyalar, limit və davamlılıq', 'Törəmə və tətbiqləri', 'İbtidai funksiya və inteqral', 'Üstlü, loqarifmik və triqonometrik funksiyalar', 'Tənliklər və bərabərsizliklər', 'Ardıcıllıqlar və silsilələr', 'Koordinat həndəsəsi və vektorlar', 'Stereometriya və fəza ölçmələri', 'Kombinatorika, statistika və ehtimal'],
    };
    const gradeLabels = {
        '1': '1-ci sinif', '2': '2-ci sinif', '3': '3-cü sinif',
        '4': '4-cü sinif', '5': '5-ci sinif', '6': '6-cı sinif',
        '7': '7-ci sinif', '8': '8-ci sinif', '9': '9-cu sinif',
        '10': '10-cu sinif', '11': '11-ci sinif',
        all: 'Siniflərarası',
    };
    const allTopics = [...new Set(Object.values(gradeTopics).flat())].sort((a, b) => a.localeCompare(b, 'az'));

    function optionsFor(select, entries, placeholder, selectedValue) {
        select.replaceChildren();
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholder;
        select.appendChild(placeholderOption);
        entries.forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            option.selected = String(value) === String(selectedValue || '');
            select.appendChild(option);
        });
    }

    function topicsForGrade(grade) {
        return grade === 'all' ? allTopics : (gradeTopics[grade] || []);
    }

    function setTopicChoices(topicSelect, grade, selectedTopic) {
        const customValue = '__custom__';
        const topics = topicsForGrade(grade);
        optionsFor(topicSelect, topics.map(topic => [topic, topic]).concat([[customValue, 'Başqa mövzu — özüm yazacağam']]), 'Mövzu seçin', selectedTopic);
        if (selectedTopic && !topics.includes(selectedTopic)) {
            optionsFor(topicSelect, topics.map(topic => [topic, topic]).concat([[customValue, 'Başqa mövzu — özüm yazacağam']]), 'Mövzu seçin', customValue);
        }
    }

    function initCurriculumFields(root = document) {
        root.querySelectorAll('[data-curriculum-grade]').forEach(gradeSelect => {
            const prefix = gradeSelect.dataset.curriculumGrade;
            const topicSelect = root.querySelector(`[data-curriculum-topic="${prefix}"]`);
            const customInput = root.querySelector(`[data-curriculum-custom="${prefix}"]`);
            if (!topicSelect || gradeSelect.dataset.curriculumReady === 'true') return;
            gradeSelect.dataset.curriculumReady = 'true';
            optionsFor(gradeSelect, Object.entries(gradeLabels), 'Sinif seçin', gradeSelect.value);
            setTopicChoices(topicSelect, gradeSelect.value, topicSelect.dataset.initialValue || topicSelect.value);
            const syncCustom = () => {
                const custom = topicSelect.value === '__custom__';
                if (customInput) {
                    customInput.hidden = !custom;
                    customInput.required = custom;
                    if (!custom) customInput.value = '';
                }
            };
            gradeSelect.addEventListener('change', () => {
                setTopicChoices(topicSelect, gradeSelect.value, '');
                syncCustom();
            });
            topicSelect.addEventListener('change', syncCustom);
            syncCustom();
        });
    }

    function fieldsMarkup(prefix, initial = {}) {
        const gradeId = `curriculumGrade_${prefix}`;
        const topicId = `curriculumTopic_${prefix}`;
        const customId = `curriculumCustom_${prefix}`;
        const gradeOptions = Object.entries(gradeLabels).map(([value, label]) =>
            `<option value="${value}"${String(initial.grade || '') === value ? ' selected' : ''}>${label}</option>`
        ).join('');
        const topicOptions = initial.topic ? `<option value="${escapeHtml(initial.topic)}" selected>${escapeHtml(initial.topic)}</option>` : '';
        return `<div class="curriculum-fields" data-curriculum-fields="${escapeHtml(prefix)}">
            <label for="${gradeId}">Sinif *</label>
            <select id="${gradeId}" class="form-control" data-curriculum-grade="${escapeHtml(prefix)}" required>
                <option value="">Sinif seçin</option>${gradeOptions}
            </select>
            <label for="${topicId}">Riyaziyyat bölməsi / mövzu *</label>
            <select id="${topicId}" class="form-control" data-curriculum-topic="${escapeHtml(prefix)}" data-initial-value="${escapeHtml(initial.topic || '')}" required>
                <option value="">Əvvəl sinif seçin</option>${topicOptions}
            </select>
            <input id="${customId}" class="form-control" data-curriculum-custom="${escapeHtml(prefix)}" placeholder="Mövzunun adını yazın" maxlength="100" hidden>
        </div>`;
    }

    function filterMarkup() {
        return `<div class="curriculum-filters">
            <label>Sinif
                <select class="form-control" data-curriculum-filter-grade>
                    <option value="">Bütün siniflər</option>
                    ${Object.entries(gradeLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
                </select>
            </label>
            <label>Mövzu
                <select class="form-control" data-curriculum-filter-topic><option value="">Bütün mövzular</option></select>
            </label>
        </div>`;
    }

    function initFilters(root = document) {
        const grade = root.querySelector('[data-curriculum-filter-grade]');
        const topic = root.querySelector('[data-curriculum-filter-topic]');
        if (!grade || !topic || grade.dataset.curriculumReady === 'true') return;
        grade.dataset.curriculumReady = 'true';
        const updateTopics = () => {
            const current = topic.value;
            const topics = topicsForGrade(grade.value);
            optionsFor(topic, topics.map(value => [value, value]), 'Bütün mövzular', current);
        };
        grade.addEventListener('change', updateTopics);
        updateTopics();
    }

    function getMetadata(prefix) {
        const topicSelect = document.querySelector(`[data-curriculum-topic="${prefix}"]`);
        const customInput = document.querySelector(`[data-curriculum-custom="${prefix}"]`);
        const topic = topicSelect?.value === '__custom__' ? customInput?.value.trim() : topicSelect?.value;
        return {
            grade: document.querySelector(`[data-curriculum-grade="${prefix}"]`)?.value || '',
            topic: topic || '',
        };
    }

    function setMetadata(prefix, metadata = {}) {
        const grade = document.querySelector(`[data-curriculum-grade="${prefix}"]`);
        const topic = document.querySelector(`[data-curriculum-topic="${prefix}"]`);
        const custom = document.querySelector(`[data-curriculum-custom="${prefix}"]`);
        if (!grade || !topic) return;
        grade.value = metadata.grade || '';
        grade.dispatchEvent(new Event('change', { bubbles: true }));
        setTopicChoices(topic, grade.value, metadata.topic || '');
        if (topic.value === '__custom__' && custom) {
            custom.value = metadata.topic || '';
            custom.hidden = false;
            custom.required = true;
        }
    }

    function getFilters() {
        return {
            grade: document.querySelector('[data-curriculum-filter-grade]')?.value || '',
            topic: document.querySelector('[data-curriculum-filter-topic]')?.value || '',
        };
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[char]);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initCurriculumFields();
        initFilters();
    });

    window.MathCurriculum = {
        gradeLabels,
        gradeTopics,
        fieldsMarkup,
        filterMarkup,
        getMetadata,
        setMetadata,
        getFilters,
        initCurriculumFields,
        initFilters,
    };
})();
