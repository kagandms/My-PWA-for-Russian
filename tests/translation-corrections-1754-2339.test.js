import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dictionaryLines = fs.readFileSync('kelimeler_tam_strict.txt', 'utf8').split(/\r?\n/);
const sentenceDatabase = JSON.parse(fs.readFileSync('sentences_strict.json', 'utf8'));

const expectedCorrections = new Map([
    [1759, ['Кожаное пальто', 'Deri palto/kaban']],
    [1761, ['Подростковый период', 'Ergenlik dönemi']],
    [1769, ['Обидчивый', 'Alıngan, gücenen']],
    [1831, ['Взрывчатые вещества', 'Patlayıcı maddeler']],
    [1832, ['Летучие вещества', 'Uçucu maddeler']],
    [1834, ['Слабоватый', 'Biraz zayıf']],
    [1837, ['Темноватый', 'Biraz koyu']],
    [1841, ['Крепковатый', 'Biraz sert']],
    [1891, ['Жулик', 'Sahtekâr']],
    [1897, ['Безумствовать', 'Delice davranmak']],
    [1898, ['Безумствовать', 'Çılgınca davranmak']],
    [1937, ['Выигрывать', 'Kazanmak']],
    [1938, ['Выиграть', 'Galip gelmek']],
    [1946, ['Загореть', 'Bronzlaşmak']],
    [2026, ['Подсчитать', 'Saymak; hesaplamak']],
    [2039, ['Разглядеть', 'Seçip görmek; ayırt etmek; dikkatle görebilmek']],
    [2076, ['Ничей', 'Hiç kimsenin']],
    [2094, ['Кое-кто', 'Belli bir kişi; kim olduğu belirtilmeyen biri; bazı kişiler']],
    [2095, ['Кое-что', 'Belli bir şey; ne olduğu belirtilmeyen bir şey']],
    [2096, ['Кое-где', 'Belirli bazı yerlerde; yer yer']],
    [2097, ['Кое-куда', 'Belli bir yere; nereye olduğu belirtilmeyen bir yere']],
    [2098, ['Кое-когда', 'Belirli bazı zamanlarda; bazen']],
    [2111, ['Асимметричный', 'asimetrik']],
    [2124, ['Распоследний', 'en son / adi, en alt seviye']],
    [2169, ['Антигриппин', 'Gribe karşı ilaç']],
    [2171, ['Безденежье', 'Parasızlık; para sıkıntısı']],
    [2173, ['Безработица', 'İşsizlik']],
    [2232, ['Заморозки', 'Don olayları; soğuklar']],
    [2225, ['Созвездие', 'takımyıldız']],
    [2261, ['Заплаканный', 'Ağlamış; gözleri yaşlı']],
    [2309, ['Попусту', 'Boşuna; nafile']],
    [2331, ['Семь раз отмерь', 'İki ölç']],
    [2332, ['один раз отрежь', 'bir biç']],
    [2333, ['Оказывается', 'Meğer; sonradan anlaşıldı ki']],
    [2334, ['он был болен', 'O hastaydı']],
    [2338, ['Предел', 'Sınır; limit; had']],
    [1754, ['Ржаной', 'Çavdarlı; çavdardan yapılmış']],
    [1755, ['Стеклянные бусы', 'Cam boncuklar']],
    [1757, ['Квалифицированный', 'Nitelikli; kalifiye']],
    [1758, ['Эрудированный', 'Bilgili; kültürlü; çok okumuş']],
    [1760, ['Береговая охрана', 'Sahil güvenlik']],
    [1764, ['Канцелярские товары', 'Kırtasiye malzemeleri']],
    [1766, ['Краеведческий', 'Yerel tarih ile ilgili']],
    [1768, ['Впечатлительный', 'Aşırı hassas, duygusal']],
    [1827, ['Торговать', 'ticaret yapmak']],
    [1863, ['Линять', 'Tüy dökmek; rengini atmak/solmak']],
    [1884, ['Нервничать', 'Tedirgin olmak; huzursuzlanmak']],
    [1876, ['Пломбировать', 'Dişe dolgu yapmak']],
    [1967, ['Пятью', 'Beşle; beş ile']],
    [1968, ['Шестью', 'Altıyla; altı ile']],
    [1969, ['Семью', 'Yediyle; yedi ile']],
    [1970, ['Восемью', 'Sekizle; sekiz ile']],
    [2022, ['Подрасти', 'Biraz büyümek; boy atmak; büyüyüp gelişmek']],
    [2068, ['Позапрошлый', 'İki önceki; önceki dönemin de öncesindeki']],
    [2072, ['Предпраздничный', 'Bayram/özel gün öncesi']],
    [2136, ['Отремонтировать', 'tamir etmek']],
    [2174, ['Бесценок', 'Yok pahası; çok düşük fiyat']],
    [2228, ['Нехватка', 'Eksiklik; kıtlık']],
    [2246, ['Пригородный', 'Banliyöye ait; banliyö çevresindeki']],
    [1838, ['Темноватый', 'Biraz karanlık; biraz koyu']],
    [1882, ['Вредничать', 'İnat olsun diye ters davranmak; huysuzluk etmek']],
    [1905, ['Ахать', 'Ah çekmek...']],
    [1906, ['Ахнуть', 'Birden “ah!” demek...']],
    [1912, ['Глянуть', 'Göz atmak; şöyle bir bakmak']],
    [1990, ['Забросить', 'Bir yere/engelin arkasına atmak; bırakmak/terk etmek']],
    [2044, ['Сочувствовать', 'Acısını paylaşmak; duygudaşlık göstermek']],
    [2157, ['Прожить два года', 'İki yıl yaşamak; iki yıl geçirmek']],
    [2223, ['Современник', 'Çağdaş; aynı dönemde yaşamış kişi']],
    [2283, ['Всплакнуть', 'Biraz/hafifçe ağlamak; birkaç damla gözyaşı dökmek']],
    [2086, ['Неоткуда', 'Hiçbir yerden...']],
    [2087, ['Некогда', 'Vakit yok']],
    [2088, ['Незачем', 'Gerek yok']],
    [2099, ['Кое-какой', 'Belli bir türden; birtakım; az çok']],
    [2137, ['Перевезти', 'Araçla bir yerden başka yere taşımak; nakletmek']],
    [2159, ['Укачать ребенка', 'Bebeği sallayarak uyutmak; yatıştırmak']],
    [2211, ['Набережная', 'Rıhtım; su kenarındaki gezinti yolu']],
    [2224, ['Сочувствие', 'Şefkat; duygudaşlık; acıyı paylaşma']],
    [2235, ['Заезд', 'Tesise/otele giriş; varış; yarış turu veya serisi']],
    [2300, ['По-разному', 'Farklı şekillerde; türlü türlü']],
]);

const expectedSentenceCorrections = new Map([
    [1905, [
        {
            ru: 'Акробат прыгнул с высоты без страховки, и зрители начали ахать.',
            tr: 'Akrobat güvenlik halatı olmadan yüksekten atlayınca izleyiciler şaşkınlıkla “ah!” diye bağırmaya başladılar.',
        },
        {
            ru: 'Туристы начали ахать, увидев величественный вид из отеля.',
            tr: 'Turistler otelin görkemli manzarasını görünce hayranlıkla “ah!” diye haykırdı.',
        },
        {
            ru: 'Не стоит ахать при каждом неожиданном повороте нашей беседы.',
            tr: 'Sohbetimizin her beklenmedik dönüşünde “ah!” diye haykırmaya gerek yok.',
        },
    ]],
    [1906, [
        {
            ru: 'Акробат прыгнул с высоты без страховки, и зрители ахнули.',
            tr: 'Akrobat güvenlik halatı olmadan yüksekten atlayınca izleyiciler şaşkınlıkla “ah!” diye bağırdı.',
        },
        {
            ru: 'Туристы ахнули, увидев величественный вид из отеля.',
            tr: 'Turistler otelin görkemli manzarasını görünce hayranlıkla “ah!” diye haykırdı.',
        },
        {
            ru: 'Не стоит ахнуть от каждого неожиданного поворота нашей беседы.',
            tr: 'Sohbetimizin her beklenmedik dönüşünde “ah!” diye haykırmaya gerek yok.',
        },
    ]],
    [1912, [
        {
            ru: 'Старушка глянула с опаской на незнакомца, вошедшего в подъезд.',
            tr: 'Yaşlı kadın, girişe giren yabancıya tedirginlikle bir bakış attı.',
        },
        {
            ru: 'Дети могут глянуть на облака и придумать удивительные истории.',
            tr: 'Çocuklar bulutlara bakıp harika hikayeler uydurabilir.',
        },
        {
            ru: 'Лучше глянуть вперёд, чем постоянно вспоминать прошлые неудачи.',
            tr: 'Sürekli geçmiş başarısızlıkları hatırlamaktansa ileriye bir bakış atmak daha iyidir.',
        },
    ]],
    [1969, [
        {
            ru: 'Мы отправились в экспедицию с семью специалистами.',
            tr: 'Yedi uzmanla keşif gezisine çıktık.',
        },
        {
            ru: 'Проект выполняли с семью специалистами.',
            tr: 'Projeyi yedi uzmanla yürüttüler.',
        },
        {
            ru: 'В автобусе ехали с семью пассажирами.',
            tr: 'Otobüste yedi yolcuyla seyahat ediyorlardı.',
        },
    ]],
    [2044, [
        {
            ru: 'В этот тяжёлый период я искренне сочувствую вам в связи с потерей близкого человека.',
            tr: 'Bu zor dönemde yakınını kaybettiğiniz için size içtenlikle başsağlığı diliyorum.',
        },
        {
            ru: 'Я сочувствую своим коллегам, потерявшим работу из-за экономического кризиса.',
            tr: 'Ekonomik kriz nedeniyle işini kaybeden meslektaşlarımın acısını paylaşıyorum.',
        },
        {
            ru: 'Все сочувствуют семье военнослужащего, отдавшего жизнь за свою страну.',
            tr: 'Ülkesi için hayatını feda eden askerin ailesinin acısını herkes paylaşıyor.',
        },
    ]],
    [2137, [
        {
            ru: 'Он перевёз груз в другой город на грузовике.',
            tr: 'Kamyon kullanarak yükü başka bir şehre taşıdı.',
        },
        {
            ru: 'Она перевезла документы в другой офис, чтобы ускорить процесс.',
            tr: 'Süreci hızlandırmak için belgeleri başka bir ofise taşıdı.',
        },
        {
            ru: 'Они перевезли оборудование на новое место, чтобы начать работу.',
            tr: 'Çalışmaya başlamak için ekipmanı yeni bir yere taşıdılar.',
        },
    ]],
    [2331, [
        {
            ru: 'Прежде чем подписывать договор, вспомни пословицу: семь раз отмерь, один раз отрежь.',
            tr: 'Sözleşmeyi imzalamadan önce şu atasözünü hatırla: “İki ölç, bir biç.”',
        },
        {
            ru: 'В программировании важно правило: семь раз отмерь, один раз отрежь.',
            tr: 'Programlamada da şu kural önemlidir: “İki ölç, bir biç.”',
        },
        {
            ru: 'Семь раз отмерь, один раз отрежь — сказал отец перед началом ремонта.',
            tr: 'Tadilata başlamadan önce babam, “İki ölç, bir biç,” dedi.',
        },
    ]],
    [2332, [
        {
            ru: 'Прежде чем подписывать договор, вспомни пословицу: семь раз отмерь, один раз отрежь.',
            tr: 'Sözleşmeyi imzalamadan önce şu atasözünü hatırla: “İki ölç, bir biç.”',
        },
        {
            ru: 'В программировании важно правило: семь раз отмерь, один раз отрежь.',
            tr: 'Programlamada da şu kural önemlidir: “İki ölç, bir biç.”',
        },
        {
            ru: 'Семь раз отмерь, один раз отрежь — сказал отец перед началом ремонта.',
            tr: 'Tadilata başlamadan önce babam, “İki ölç, bir biç,” dedi.',
        },
    ]],
]);

test('lines 1754-2339 retain the audited Turkish translation corrections', () => {
    for (const [lineNumber, [expectedRussian, expectedTurkish]] of expectedCorrections) {
        assert.ok(lineNumber >= 1754 && lineNumber <= 2339, `correction outside target range on line ${lineNumber}`);

        const dictionaryLine = dictionaryLines[lineNumber - 1];
        const separatorMatches = dictionaryLine.match(/ : /g) ?? [];

        assert.equal(separatorMatches.length, 1, `expected one dictionary separator on line ${lineNumber}`);
        assert.match(dictionaryLine, /^[^:\r\n]+ : [^:\r\n]+$/, `invalid dictionary line format on line ${lineNumber}`);

        const separatorIndex = dictionaryLine.indexOf(' : ');
        const actualRussian = dictionaryLine.slice(0, separatorIndex);
        const actualTurkish = dictionaryLine.slice(separatorIndex + 3);

        assert.equal(actualRussian, expectedRussian, `Russian expression changed on line ${lineNumber}`);
        assert.equal(actualTurkish, expectedTurkish, `wrong Turkish translation on line ${lineNumber}`);
    }
});

test('every dictionary line from 1754 through 2339 has one valid separator', () => {
    for (let lineNumber = 1754; lineNumber <= 2339; lineNumber += 1) {
        const dictionaryLine = dictionaryLines[lineNumber - 1];
        const separatorMatches = dictionaryLine.match(/ : /g) ?? [];

        assert.equal(separatorMatches.length, 1, `expected one dictionary separator on line ${lineNumber}`);
        assert.match(dictionaryLine, /^[^:\r\n]+ : [^:\r\n]+$/, `invalid dictionary line format on line ${lineNumber}`);
    }
});

test('sentence corrections retain the requested Russian and Turkish pairings', () => {
    for (const [sentenceKey, expectedSentences] of expectedSentenceCorrections) {
        assert.deepEqual(sentenceDatabase[String(sentenceKey)], expectedSentences, `wrong sentence corrections on key ${sentenceKey}`);
    }
});
