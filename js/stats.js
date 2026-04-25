class StatsMode {
    constructor() {
        this.chartInstance = null;
    }

    init() {
        this.renderChart();
        this.generateAdvice();
    }

    getCategoryStats() {
        const stats = app.stats.wordProgress;
        const categoryData = {};

        // Veritabanındaki tüm kelimeleri kategorilerine göre grupla
        WORDS.forEach(word => {
            const cat = word.category || 'Genel Kelimeler';
            if (!categoryData[cat]) {
                categoryData[cat] = { correct: 0, wrong: 0, totalAttempts: 0 };
            }

            const wordKey = app.getWordStorageKey(word.id);
            const wordStat = stats[wordKey] || stats[String(word.id)];
            if (wordStat) {
                categoryData[cat].correct += (wordStat.correct || 0);
                categoryData[cat].wrong += (wordStat.wrong || 0);
                categoryData[cat].totalAttempts += ((wordStat.correct || 0) + (wordStat.wrong || 0));
            }
        });

        // Accuracy yüzdelerini hesapla
        const labels = [];
        const dataPoints = [];
        const details = [];

        for (const [cat, data] of Object.entries(categoryData)) {
            if (data.totalAttempts > 0) {
                const accuracy = Math.round((data.correct / data.totalAttempts) * 100);
                labels.push(cat);
                dataPoints.push(accuracy);
                details.push(data);
            }
        }

        return { labels, dataPoints, details };
    }

    renderChart() {
        const ctx = document.getElementById('radarChart');
        if (!ctx) return;

        const { labels, dataPoints } = this.getCategoryStats();

        if (labels.length === 0) {
            // Veri yoksa placeholder göster
            if (this.chartInstance) this.chartInstance.destroy();
            return;
        }

        if (this.chartInstance) {
            this.chartInstance.destroy(); // Eski grafiği temizle
        }

        // Renk paleti (Duolingo / Gamification tarzı)
        this.chartInstance = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Başarı Oranı (%)',
                    data: dataPoints,
                    backgroundColor: [
                        'rgba(28, 176, 246, 0.7)',  // Blue
                        'rgba(88, 204, 2, 0.7)',    // Green
                        'rgba(255, 150, 0, 0.7)',   // Orange
                        'rgba(206, 130, 255, 0.7)', // Purple
                        'rgba(255, 75, 75, 0.7)',   // Red
                        'rgba(252, 222, 0, 0.7)',   // Yellow
                        'rgba(0, 225, 255, 0.7)'    // Cyan
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.9)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { stepSize: 20 },
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        pointLabels: {
                            font: { size: 12, family: "'Nunito', sans-serif", weight: 'bold' }
                        }
                    }
                },
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }

    generateAdvice() {
        const adviceEl = document.getElementById('adviceText');
        if (!adviceEl) return;

        const { labels, dataPoints } = this.getCategoryStats();

        if (labels.length === 0) {
            adviceEl.innerHTML = "Bana henüz bir veri sunmadın. Biraz Flashcard veya Quiz çöz ki zayıflıklarını bulayım! 🧠";
            return;
        }

        const minIndex = dataPoints.indexOf(Math.min(...dataPoints));
        const maxIndex = dataPoints.indexOf(Math.max(...dataPoints));

        const weakestCategory = labels[minIndex];
        const strongestCategory = labels[maxIndex];
        const weakestScore = dataPoints[minIndex];
        const strongestScore = dataPoints[maxIndex];

        if (weakestScore >= 80) {
            adviceEl.innerHTML = `Mükemmelsin! Tüm kategorilerde harika gidiyorsun (Min: %${weakestScore}). Rusça'yı adeta sömürüyorsun! 🚀`;
        } else {
            adviceEl.innerHTML = `<strong>${strongestCategory}</strong> kategorisinde çok iyisin (%${strongestScore}), fakat <strong>${weakestCategory}</strong> konusunda biraz eksiğin var (%${weakestScore}). Bir sonraki çalışmanda Kategoriler menüsünden "${weakestCategory}" seçerek buraya odaklanmalısın. O eksiği kapatırız! 💪`;
        }
    }
}

window.statsMode = new StatsMode();
