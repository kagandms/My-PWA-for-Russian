/**
 * TORFL (Test of Russian as a Foreign Language) Mode
 * Supports uploading custom questions via JSON/TXT
 */
class TORFLMode {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
    }

    init() {
        // Event listener for file upload
        const input = document.getElementById('torflUpload');
        input.onchange = (e) => this.handleFileUpload(e);

        this.showMenu();
    }

    showMenu() {
        document.getElementById('torflMenu').classList.remove('hidden');
        document.getElementById('torflQuiz').classList.add('hidden');
        this.renderList();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let parsed = [];

                if (file.name.endsWith('.json')) {
                    const raw = JSON.parse(content);
                    // Guard against prototype pollution — only accept plain arrays
                    if (!Array.isArray(raw)) throw new Error('Invalid format');
                    parsed = raw.map(item => ({
                        question: String(item.question || ''),
                        options: Array.isArray(item.options) ? item.options.map(String) : [],
                        answer: Number(item.correct) || 0
                    }));
                } else {
                    // Simple TXT parser: Question | Op1,Op2,Op3,Op4 | CorrectIndex (0-3)
                    const lines = content.split('\n');
                    lines.forEach(line => {
                        const parts = line.split('|');
                        if (parts.length >= 3) {
                            parsed.push({
                                question: parts[0].trim(),
                                options: parts[1].split(',').map(o => o.trim()),
                                answer: parseInt(parts[2].trim())
                            });
                        }
                    });
                }

                if (parsed.length > 0) {
                    this.questions = parsed;
                    alert(`${parsed.length} soru yüklendi!`);
                    this.startQuiz();
                } else {
                    alert("Soru bulunamadı veya format hatalı.");
                }
            } catch (err) {
                console.error(err);
                alert("Dosya okuma hatası!");
            }
        };
        reader.readAsText(file);
    }

    renderList() {
        // Show current loaded questions if any, otherwise empty state
        const list = document.getElementById('torflList');
        const empty = document.getElementById('torflEmpty');

        if (this.questions.length === 0) {
            empty.classList.remove('hidden');
            list.innerHTML = '';
        } else {
            empty.classList.add('hidden');
            list.innerHTML = `
                <div class="torfl-item" onclick="window.torflMode.startQuiz()">
                    <span class="torfl-title">Yüklü Soru Paketi</span>
                    <span class="torfl-meta">${this.questions.length} Soru</span>
                </div>
            `;
        }
    }

    startQuiz() {
        document.getElementById('torflMenu').classList.add('hidden');
        document.getElementById('torflQuiz').classList.remove('hidden');

        this.currentIndex = 0;
        this.score = 0;
        this.showQuestion();
    }

    showQuestion() {
        if (this.currentIndex >= this.questions.length) {
            alert(`Sınav Bitti! Skorunuz: ${this.score} / ${this.questions.length}`);
            this.showMenu();
            return;
        }

        const q = this.questions[this.currentIndex];
        document.getElementById('torflQuestion').textContent = q.question;

        const optionsDiv = document.getElementById('torflOptions');
        optionsDiv.innerHTML = '';

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = opt;
            btn.onclick = () => this.checkAnswer(idx, q.answer, btn);
            optionsDiv.appendChild(btn);
        });

        document.getElementById('torflFeedback').classList.add('hidden');
    }

    checkAnswer(selectedIdx, correctIdx, btn) {
        const buttons = document.querySelectorAll('#torflOptions .quiz-option');
        buttons.forEach(b => b.classList.add('disabled'));

        if (selectedIdx === correctIdx) {
            btn.classList.add('correct');
            this.score++;
            document.getElementById('torflFeedbackText').textContent = "Правильно!";
            document.getElementById('torflFeedbackText').className = "correct-text";
        } else {
            btn.classList.add('wrong');
            buttons[correctIdx].classList.add('correct');
            document.getElementById('torflFeedbackText').textContent = "Неправильно!";
            document.getElementById('torflFeedbackText').className = "wrong-text";
        }

        document.getElementById('torflFeedback').classList.remove('hidden');
        document.getElementById('torflNext').onclick = () => {
            this.currentIndex++;
            this.showQuestion();
        };
    }
}

window.torflMode = new TORFLMode();
