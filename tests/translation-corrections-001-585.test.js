import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dictionaryLines = fs.readFileSync('kelimeler_tam_strict.txt', 'utf8').split(/\r?\n/);
const sentenceDatabase = JSON.parse(fs.readFileSync('sentences_strict.json', 'utf8'));

const expectedCorrections = new Map([
    [1, ['Мир тесен', 'Dünya küçük']],
    [4, ['Учиться', 'Öğrenmek; okumak/eğitim görmek']],
    [18, ['Можно себе позволить', 'Gücü yetmek; maddi olarak karşılayabilmek']],
    [22, ['Подрабатывать', 'Ek iş yapmak; ek işte çalışmak']],
    [23, ['Подработать', 'Ek iş yapmak; kısa süreli ek işte çalışmak']],
    [29, ['Консалтинговая компания', 'Danışmanlık şirketi']],
    [35, ['Пере-', 'Köprüyü geçmek, karşıdan karşıya geçmek, sınıf geçmek']],
    [39, ['Ездить', 'Araçla gidip gelmek; seyahat etmek']],
    [40, ['Вы-', 'Dışarı çıkmak/çıkıp gitmek; bağlama göre uzaklaşmak']],
    [41, ['У-', 'Uzaklaşmak/ayrılmak; gitmek']],
    [43, ['Во Владивосток', "Vladivostok'a"]],
    [47, ['Претендовать', 'İddia etmek; talip olmak; hak iddia etmek']],
    [53, ['С одной стороны', 'Bir yandan']],
    [54, ['С другой стороны', 'Öte yandan']],
    [60, ['Чаще всего', 'En sık; çoğu zaman']],
    [61, ['Посетить', 'Ziyaret etmek; gidip görmek']],
    [70, ['Я промок до нитки', 'İliklerime kadar/sırılsıklam ıslandım']],
    [71, ['Появиться', 'görünmek, gözükmek']],
    [73, ['Иначе', 'Başka türlü']],
    [81, ['Противно', 'İğrenç; tiksindirici; itici']],
    [96, ['Мало где', 'Çok az yerde; birkaç yerde']],
    [103, ['Сохнуть', 'Kurumak']],
    [104, ['Высохнуть', 'Kurumak; tamamen kuruyup bitmek']],
    [116, ['День всех святых', 'Tüm Azizler Günü']],
    [121, ['Двенадцать часов', 'Saat on iki']],
    [122, ['Пять минут первого', 'Saat on ikiyi beş geçiyor']],
    [123, ['Десять минут второго', 'Saat biri on geçiyor']],
    [124, ['Пятнадцать минут (или просто четверть) третьего', 'Saat ikiyi çeyrek geçiyor']],
    [125, ['Двадцать минут четвёртого', 'Saat üçü yirmi geçiyor']],
    [126, ['Двадцать пять минут пятого', 'Saat dördü yirmi beş geçiyor']],
    [127, ['Полшестого, половина шестого, тридцать минут шестого', 'Saat beş buçuk; beşi otuz geçiyor']],
    [128, ['Без двадцати пяти семь', 'Saat yediye yirmi beş var']],
    [129, ['Без двадцати восемь', 'Saat sekize yirmi var']],
    [130, ['Без четверти / пятнадцати девять', 'Saat dokuza çeyrek var']],
    [131, ['Без десяти десять', 'Saat ona on var']],
    [132, ['Без пяти одиннадцать', 'Saat on bire beş var']],
    [143, ['Перерывать', 'Altını üstüne getirmek; didik didik aramak']],
    [146, ['Несмотря на ...', 'Rağmen']],
    [151, ['Растрогать', 'Duygulandırmak; duygusal olarak etkilemek']],
    [153, ['Время бежит', 'Zaman hızla geçiyor']],
    [154, ['летит', 'Uçup gidiyor; hızla geçiyor']],
    [155, ['Сверять время', 'Saati karşılaştırmak/kontrol etmek']],
    [156, ['Ни разу', 'Bir kez bile (olumsuz cümlede); hiç']],
    [159, ['Ни бе ни ме ни кукареку', 'Hiçbir şey bilmeyen/anlamayan; cevap veremeyen']],
    [168, ['Заваливать', 'Yığmak; çuvallamak']],
    [173, ['Желтеть', 'Sararmak']],
    [180, ['Поступить', 'Davranmak; hareket etmek; tutum sergilemek']],
    [175, ['Сказать', 'söylemek']],
    [184, ['Занять', 'borç almak']],
    [190, ['Зависимость', 'Bağımlılık']],
    [198, ['Тихоня', 'İçine kapalı, başkalarıyla iletişimi zor olan']],
    [207, ['Пофигист', 'Umursamaz; hiçbir şeyi dert etmeyen kişi']],
    [209, ['Домосед', 'Evcimen; evden çıkmayı sevmeyen kişi']],
    [213, ['Болтун', 'Geveze; çok konuşan kişi']],
    [214, ['Болтушка', 'Geveze; çok konuşan kişi']],
    [222, ['Фотографировать', 'Fotoğraf çekmek']],
    [268, ['Вероятно', 'Muhtemel/olası; büyük olasılıkla']],
    [272, ['Я похож на маму, тем что у меня такой же характер', 'Aynı karaktere sahip olduğum için anneme benziyorum']],
    [277, ['Драться', 'Kavga etmek; dövüşmek']],
    [273, ['Сочувствовать', 'Acısını paylaşmak; duygudaşlık göstermek']],
    [274, ['Сочувствовать', 'Acısını paylaşmak; duygudaşlık göstermek']],
    [302, ['Коммуналка', 'Ortak daire']],
    [305, ['Кружка', 'Kupa']],
    [306, ['Кружка', 'Kupa']],
    [309, ['Кисель', 'Nişastayla koyulaştırılmış meyveli tatlı/içecek; kisel']],
    [311, ['Тошнить', 'Midesi bulanmak; kusacak gibi olmak']],
    [314, ['Изжога', 'Mide ekşimesi']],
    [317, ['...-то', 'Belirli fakat bilinmeyen bir şeyi belirtir']],
    [318, ['С прилагательного на глагол', 'Sıfattan Fiile']],
    [335, ['Всё равно', 'Fark etmez; yine de']],
    [336, ['Наладить', 'Yoluna koymak; düzene sokmak; kurmak/iyileştirmek']],
    [340, ['Выражение', 'İfade']],
    [342, ['Время как песок сквозь пальцы', 'Zaman parmakların arasından kum gibi akıp gider']],
    [343, ['В противном случае', 'Aksi takdirde']],
    [345, ['Возможность', 'İmkân; olanak']],
    [348, ['Естественно', 'tabii']],
    [354, ['Мне не по душе', 'Hoşuma gitmiyor']],
    [355, ['Очевидно', 'Açıkça; belli ki']],
    [366, ['Тебе придётся', 'Mecbur kalacaksın; yapmak zorunda kalacaksın']],
    [368, ['В связи с этим', 'Bununla bağlantılı olarak; bu nedenle']],
    [378, ['Ни шагу', 'Bir adım bile atma; yerinden kıpırdama']],
    [377, ['Ни разу', 'Bir kez bile; hiç']],
    [387, ['Приобрести', 'Edinmek; elde etmek; satın almak']],
    [394, ['Присутствовать', 'Katılmak; hazır bulunmak; mevcut olmak']],
    [407, ['Большое количество', 'Çok sayıda; büyük miktarda']],
    [416, ['Ослабить', 'Zayıflatmak; gücünü azaltmak']],
    [430, ['Позволить', 'İzin vermek']],
    [438, ['Безусловно', 'Kesinlikle; şüphesiz']],
    [442, ['С моей точки зрения', 'Benim bakış açıma göre']],
    [447, ['Отучить', 'Bir alışkanlıktan vazgeçirmek']],
    [460, ['Пересекать', 'Geçmek; karşıya geçmek; kesmek/çaprazlamak']],
    [461, ['Преобладать', 'Ağır basmak; çoğunlukta olmak']],
    [462, ['Превышать', 'Aşmak; üstünde olmak']],
    [463, ['Заявлять', 'Beyan etmek; açıklamak']],
    [464, ['Нарастать', 'Artmak; güçlenmek']],
    [465, ['Отдельные', 'Bazı; ayrı ayrı']],
    [466, ['Ведущий', 'Önde gelen; başlıca']],
    [467, ['Имущество', 'Mülk; mal varlığı']],
    [468, ['Материальный уровень', 'Maddi düzey; refah seviyesi']],
    [469, ['Ежедневно', 'Her gün; günlük olarak']],
    [471, ['Кроме того', 'Buna ek olarak; ayrıca']],
    [472, ['Предусматривать', 'Öngörmek; öngörülmek (sözleşmede)']],
    [473, ['Основной', 'Temel; esas (kanun)']],
    [483, ['Застегнуть', 'Düğme iliklemek; fermuar çekmek']],
    [514, ['Отказ', 'Ret; reddetme']],
    [515, ['Отказ', 'Ret; reddetme']],
    [516, ['Отказ', 'Ret; reddetme; vazgeçme/bırakma']],
    [580, ['Прямо', 'Doğrudan; dosdoğru']],
    [585, ['Очно', 'Yüz yüze']],
]);

test('lines 1-585 retain the audited Turkish translation corrections', () => {
    for (const [lineNumber, [expectedRussian, expectedTurkish]] of expectedCorrections) {
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

test('sentence key 143 uses прерывать for interrupting a conversation', () => {
    assert.deepEqual(sentenceDatabase['143'][0], {
        ru: 'Он прерывал разговор, чтобы не обидеть её.',
        tr: 'Onu gücendirmemek için konuşmayı kesiyordu.',
    });
});

test('screenshot-derived sentence corrections retain standard Russian and Turkish forms', () => {
    assert.equal(sentenceDatabase['47'][1].tr, 'Başarılı bir projeden sonra yöneticilik pozisyonuna talip olmaya başladı.');
    assert.equal(sentenceDatabase['53'][0].tr, 'Bir yandan yeni iş yüksek maaş sunuyor.');
    assert.equal(sentenceDatabase['54'][0].tr, 'Öte yandan hafta sonları ve bayramlarda çalışmak zorunda kalacaksın.');
    assert.equal(sentenceDatabase['60'][0].tr, 'Kavgalar en sık anlayışsızlık ve birbirini dinlememekten kaynaklanır.');
    assert.equal(sentenceDatabase['60'][1].ru, 'Чаще всего туристы приезжают в этот город летом, когда море тёплое.');
    assert.equal(sentenceDatabase['146'][0].ru, 'Несмотря на дождь, мы пошли на прогулку.');
    assert.equal(sentenceDatabase['151'][0].ru, 'Эта история смогла растрогать всех присутствующих.');
    assert.equal(sentenceDatabase['156'][0].ru, 'Ни разу за всё утро он не ошибся.');
    assert.equal(sentenceDatabase['180'][1].tr, 'Nedensiz yere onu suçladığında haksız davrandı.');
    assert.equal(sentenceDatabase['273'][0].tr, 'Bu zor dönemde yakınınızı kaybettiğiniz için size içtenlikle başsağlığı diliyorum.');
    assert.equal(sentenceDatabase['302'][0].ru, 'Коммуналка в городе всегда переполнена жителями.');
    assert.equal(sentenceDatabase['377'][0].tr, 'Gitmeyi çok istememe rağmen Moskova’da hiç bulunmadım.');
    assert.equal(sentenceDatabase['377'][1].ru, 'Она ни разу не опаздывала на работу за пять лет.');
    assert.equal(sentenceDatabase['893'][0].ru, 'Родители любят хвалить детей за хорошие оценки.');
    assert.equal(sentenceDatabase['905'][0].ru, 'После потери работы он стал чувствовать себя одиноким.');
    assert.equal(sentenceDatabase['1379'][1].ru, 'Пианист, учившийся в консерватории, выиграл международный конкурс.');
});

test('every dictionary line from 1 through 585 has one valid separator', () => {
    for (let lineNumber = 1; lineNumber <= 585; lineNumber += 1) {
        const dictionaryLine = dictionaryLines[lineNumber - 1];
        const separatorMatches = dictionaryLine.match(/ : /g) ?? [];

        assert.equal(separatorMatches.length, 1, `expected one dictionary separator on line ${lineNumber}`);
        assert.match(dictionaryLine, /^[^:\r\n]+ : [^:\r\n]+$/, `invalid dictionary line format on line ${lineNumber}`);
    }
});
