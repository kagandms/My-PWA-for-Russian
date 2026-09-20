import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dictionaryLines = fs.readFileSync('kelimeler_tam_strict.txt', 'utf8').split(/\r?\n/);

const expectedCorrections = new Map([
    [587, ['Нечаянно', 'Yanlışlıkla']],
    [588, ['Холодное оружие', 'Soğuk silah']],
    [595, ['Племянница', 'Kız yeğen']],
    [607, ['Отступать', 'Geri çekilmek']],
    [611, ['Чистовик', 'Temize çekilmiş son nüsha']],
    [614, ['Густой', 'Yoğun; koyu']],
    [620, ['Красавец', 'Yakışıklı; yakışıklı adam']],
    [626, ['Анализировать', 'Analiz etmek']],
    [628, ['Ангина', 'Anjin; bademcik iltihabı']],
    [629, ['Аспирант', 'Doktora öğrencisi']],
    [630, ['аспирантка', 'Doktora öğrencisi']],
    [631, ['Аспирантура', 'Doktora eğitimi']],
    [637, ['Беречь', 'Korumak']],
    [639, ['Беспокоиться', 'Endişelenmek']],
    [640, ['Бланк', 'Form']],
    [641, ['Ближе', 'Daha yakın']],
    [650, ['Велик', 'Bisiklet']],
    [653, ['Вести себя', 'Davranmak']],
    [654, ['Вести себя', 'Davranmak']],
    [655, ['Власть', 'İktidar; güç']],
    [656, ['Власть', 'Otorite; yetki']],
    [669, ['Впервые', 'İlk kez']],
    [675, ['Выражать', 'İfade etmek']],
    [682, ['Замечательный', 'Harika; muhteşem']],
    [693, ['Удивленный', 'Şaşırmış; şaşkın']],
    [696, ['Предполагать', 'Varsaymak; tahmin etmek']],
    [697, ['Предполагать', 'fikir yürütmek']],
    [700, ['Мудрый', 'Bilge']],
    [712, ['Алиби', 'Alibi']],
    [714, ['Фонд', 'Fon']],
    [715, ['Влиятельный', 'Etkili; nüfuzlu']],
    [719, ['Чёткий', 'Net; açık']],
    [720, ['ровный', 'Düz; eşit']],
    [731, ['Один умножить на ноль равно ноль', 'Bir çarpı sıfır sıfıra eşittir']],
    [732, ['Чётные и нечётные', 'Çift ve tek sayılar']],
    [737, ['Зелень', 'Yeşillik']],
    [748, ['Какая картинка!', 'Ne güzel bir resim!']],
    [751, ['Во время...', '... sırasında; ... esnasında']],
    [752, ['Переплатить', 'Fazla ödemek']],
    [754, ['Проспать', 'Fazla uyumak; uyuyup geç kalmak; uykuda geçirip kaçırmak']],
    [757, ['Жесть', 'Vay be; çok fena!']],
    [758, ['Ржака', 'Çok komik; kopmalık']],
    [759, ['Дерьмо', 'Bok; pislik']],
    [760, ['Мудак', 'Göt herif; pislik']],
    [761, ['Ублюдок', 'Piç; alçak']],
    [762, ['Хуйня', 'Saçmalık; boktan şey']],
    [763, ['Осёл', 'Eşek; aptal']],
    [764, ['Пизда', 'Am; amcık']],
    [765, ['Писька', 'Kuku; çocuk dilinde cinsel organ']],
    [766, ['Говно', 'Bok; pislik']],
    [782, ['Перед...', '...-in önünde; ...-den önce']],
    [783, ['Перед...', '...-den önce']],
    [790, ['Не только... но...', 'Sadece ... değil, ... da']],
    [792, ['А ты кем устраиваешься?', 'Sen ne olarak işe giriyorsun?']],
    [793, ['А', 'Ama; oysa; ise']],
    [795, ['Нам нечего терять', 'Kaybedecek hiçbir şeyimiz yok']],
    [796, ['говорить', 'Konuşmak; söylemek']],
    [800, ['Перед тем как', '...-meden önce']],
    [810, ['Выбивать', 'Vurarak çıkarmak/sökmek; kırıp çıkarmak']],
    [823, ['Зависеть', '...-e bağlı olmak']],
    [824, ['Замедлять', 'Yavaşlatmak']],
    [825, ['Занять', 'Yer kaplamak; meşgul etmek; (birinden) borç/ödünç almak; (konuşma dilinde birine) borç vermek']],
    [829, ['Манить', 'İşaret vererek çağırmak']],
    [830, ['Надоедать', 'Rahatsız etmek']],
    [831, ['Надоедать', 'Bıktırmak']],
    [832, ['Намекать', 'İma etmek']],
    [838, ['Обозначать', 'Belirtmek; ifade etmek']],
    [839, ['Одобрять', 'Onaylamak']],
    [848, ['Отражать', 'Yansıtmak; geri püskürtmek']],
    [863, ['Посоветовать', 'Tavsiyede bulunmak']],
    [880, ['Угощать', 'İkram etmek']],
    [942, ['Защищаться', 'Kendini savunmak']],
    [890, ['Уснуть', 'Uykuya dalmak']],
    [893, ['Хвалить', 'Övmek']],
    [895, ['Чихать', 'Hapşırmak']],
    [906, ['Связать', 'Bağlamak']],
    [907, ['Связать', 'Birleştirmek']],
    [908, ['Скачать', 'İndirmek']],
    [909, ['Скачать', 'İndirmek']],
    [914, ['Суметь', 'Başarabilmek']],
    [919, ['Справиться', 'Başa çıkmak']],
    [920, ['Строить', 'İnşa etmek']],
    [927, ['Обманывать', 'Aldatmak; hile yapmak']],
    [928, ['Ишак', 'Eşek']],
    [936, ['Мелочи', 'Önemsiz şeyler; ufak tefek şeyler']],
    [970, ['Оглавление', 'İçindekiler']],
    [1059, ['Стаж', 'Kıdem; çalışma süresi']],
    [1064, ['Поглощать', 'Soğurmak; yutmak/içine çekmek; tüketmek; tamamen meşgul etmek']],
    [1092, ['Дремать', 'Uyuklamak; kestirmek']],
    [1095, ['Несчастье', 'Talihsizlik; felaket']],
    [1096, ['Беда', 'Dert; bela']],
    [905, ['Расчувствоваться', 'Duygulanmak']],
    [1115, ['Возмущение', 'İnfial; öfke; kızgınlık']],
    [1111, ['Изумляться', 'Şaşırmak; hayrete düşmek']],
    [1119, ['Сатира', 'Hiciv; yergi']],
    [1130, ['Сожрать', '(argo/kaba) Tıkınmak; mideye indirmek']],
    [1137, ['Порок', 'Kusur; kötü huy; ahlaksızlık']],
    [1146, ['Унижаться', 'Kendini aşağılamak; alçalmak']],
    [1151, ['Неприязнь', 'Antipati; soğukluk']],
    [1157, ['Просто', 'Basit; sadece; sırf']],
]);

test('lines 586-1169 retain the audited Turkish translation corrections', () => {
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

test('every dictionary line from 586 through 1169 has one valid separator', () => {
    for (let lineNumber = 586; lineNumber <= 1169; lineNumber += 1) {
        const dictionaryLine = dictionaryLines[lineNumber - 1];
        const separatorMatches = dictionaryLine.match(/ : /g) ?? [];

        assert.equal(separatorMatches.length, 1, `expected one dictionary separator on line ${lineNumber}`);
        assert.match(dictionaryLine, /^[^:\r\n]+ : [^:\r\n]+$/, `invalid dictionary line format on line ${lineNumber}`);
    }
});
