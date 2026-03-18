/**
 * Categories (Üniteler) Mode
 * Kelimelerin ".category" verisine göre gruplandırılarak çalışılmasını sağlar.
 */

class CategoriesMode {
    constructor() {
        this.categories = new Set();
        this.currentCategory = null;
        this.categoryWords = [];
        this.setupListeners();
    }

    setupListeners() {
        // Geri butonu (Kategori Detayından -> Kategoriler Kılavuzuna)
        const backBtn = document.getElementById('categoryBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showLanding());
        }

        // Seçilen Üniteyi Flashcard/Quiz olarak Çalıştırma
        const studyBtn = document.getElementById('categoryStudyBtn');
        if (studyBtn) {
            studyBtn.addEventListener('click', () => this.studyCurrentCategory());
        }
    }

    init() {
        if (!WORDS || WORDS.length === 0) return;

        // 1. Kategorileri topla
        this.categories = new Set();
        WORDS.forEach(word => {
            if (word.category) {
                this.categories.add(word.category);
            }
        });

        // Eğer 0 kategori bulunduysa hepsi genel atanmıştır
        if (this.categories.size === 0) {
            this.categories.add("Genel Kelimeler");
        }

        this.renderLanding();
        this.showLanding();
    }

    // Ana Ekran: Ünitelerin Kutu Kutu (Grid) Gösterimi
    renderLanding() {
        const grid = document.getElementById('categoryGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Kategori kartı HTML'ini oluşturuyoruz
        // Dinamik ikonlar
        const icons = {
            'Fiiller': '🏃',
            'Sıfatlar': '🎨',
            'Yemek & Mutfak': '🍔',
            'Zaman & Takvim': '🕒',
            'Yönler & Konum': '📍',
            'Meslek & Eğitim': '🎓',
            'İnsan & Aile': '👥',
            'Teknoloji & Araçlar': '📱',
            'Doğa & Hayvanlar': '🌲',
            'Ev & Eşyalar': '🏠',
            'Vücut & Sağlık': '🩺',
            'Duygular & Düşünceler': '❤️',
            'Sayılar & Miktarlar': '🔢',
            'Eş/Zıt Anlamlılar': '↔️',
            'Argo & Günlük İfadeler': '🔥',
            'Genel Kelimeler': '📚'
        };

        const sortedCategories = Array.from(this.categories).sort();

        sortedCategories.forEach(cat => {
            const wordCount = WORDS.filter(w => w.category === cat).length;
            const icon = icons[cat] || '📓';

            const btn = document.createElement('button');
            btn.className = 'mode-card'; // index.html deki global grid yapısından devralır
            btn.innerHTML = `
                <span class="mode-icon">${icon}</span>
                <span class="mode-title">${cat}</span>
                <span class="mode-desc">${wordCount} kelime</span>
            `;

            // Kategoriye Tıklama Olayı
            btn.addEventListener('click', () => {
                this.openCategoryDetail(cat, wordCount);
            });

            grid.appendChild(btn);
        });
    }

    // Detay Ekranı: Belirli bir kategorinin kelimelerinin listesi
    openCategoryDetail(categoryName, wordCount) {
        this.currentCategory = categoryName;
        this.categoryWords = WORDS.filter(w => w.category === categoryName);

        // Başlığı güncelle
        document.getElementById('categoryTitle').textContent = `${categoryName} (${wordCount})`;

        // Listeyi doldur
        const list = document.getElementById('categoryWordsList');
        list.innerHTML = '';

        this.categoryWords.forEach(word => {
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

            // Favori Butonu
            const favBtn = document.createElement('button');
            const isFav = window.favoritesManager?.isFavorite(word.id);
            favBtn.className = `favorite-btn ${isFav ? 'active' : ''}`;
            favBtn.innerHTML = '☆';
            favBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isActive = window.favoritesManager?.toggleFavorite(word.id);
                favBtn.classList.toggle('active', isActive);
            };

            header.appendChild(textGroup);
            header.appendChild(favBtn);
            el.appendChild(header);

            if (word.example && word.example.russian) {
                const ex = document.createElement('div');
                ex.className = 'example-container';
                ex.innerHTML = `
                    <p class="ex-ru">${word.example.russian}</p>
                    <p class="ex-tr">${word.example.turkish}</p>
                `;
                el.appendChild(ex);
            }

            list.appendChild(el);
        });

        // Görünümleri değiştir
        document.getElementById('categoriesLanding').classList.add('hidden');
        document.getElementById('categoryDetailView').classList.remove('hidden');
    }

    showLanding() {
        document.getElementById('categoriesLanding').classList.remove('hidden');
        document.getElementById('categoryDetailView').classList.add('hidden');
    }

    studyCurrentCategory() {
        if (!this.categoryWords || this.categoryWords.length === 0) return;

        // Flashcard Modunu bu yeni data kümesiyle başlat:
        // Global WORDS değişkenini geçici ezip, quiz sonunda geri alabiliriz ya da 
        // daha basit bir taktik: FlashcardMode'in WORDS'u okuma mantığını dıştırmak yerine
        // Uygulamamızda flashcard window.flashcardMode.words olarak okur (bazen).

        alert("Üniteleri Flashcard vb. diğer modlarla bağlama (Filtreleme) henüz tam entegre çalışmayabilir, liste ekranından takip edebilirsiniz.");
    }
}

// Uygulamaya Entegre (DOM load gerekmez, html sonuna eklendiği için)
window.categoriesMode = new CategoriesMode();
