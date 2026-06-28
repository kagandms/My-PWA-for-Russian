class PrefixesMode {
    constructor() {
        this.prefixWords = [];
    }

    init() {
        if (!WORDS || WORDS.length === 0) return;

        this.prefixWords = WORDS.filter(w => w.category === 'Prefiksler');

        const studyBtn = document.getElementById('prefixesStudyBtn');
        if (studyBtn) {
            studyBtn.onclick = () => {
                window.app.openMode('quiz', { customWordList: this.prefixWords });
            };
        }

        this.renderPrefixes();
        document.getElementById('prefixesMode').classList.remove('hidden');
    }

    renderPrefixes() {
        const list = document.getElementById('prefixesList');
        if (!list) return;

        list.innerHTML = '';
        
        // update count
        const countSpan = document.getElementById('prefixesCount');
        if (countSpan) countSpan.textContent = this.prefixWords.length;

        this.prefixWords.forEach(word => {
            const el = document.createElement('div');
            el.className = 'word-item';

            const header = document.createElement('div');
            header.className = 'word-header';

            const textGroup = document.createElement('div');
            textGroup.innerHTML = `
                <span class="ru">${word.russian}</span>
                <span class="divider">-</span>
                <span class="tr">${word.turkish}</span>
            `;

            header.appendChild(textGroup);
            el.appendChild(header);

            list.appendChild(el);
        });
    }
}

window.prefixesMode = new PrefixesMode();
