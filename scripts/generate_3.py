import json

results = {
    "542": [
        {"ru": "На берегу моря мы собирали мелкие красивые ракушки весь день.", "tr": "Deniz kıyısında bütün gün küçük güzel deniz kabukları topladık."},
        {"ru": "Этот мелкий шрифт очень трудно прочитать без специальных очков.", "tr": "Bu küçük yazıyı özel gözlükler olmadan okumak çok zor."},
        {"ru": "Мелкий дождь шёл с самого утра, поэтому мы остались дома.", "tr": "Sabahtan beri ince yağmur yağıyordu, bu yüzden evde kaldık."}
    ],
    "543": [
        {"ru": "Мягкость её голоса успокаивала меня даже в самые трудные моменты.", "tr": "Sesinin yumuşaklığı en zor anlarda bile beni sakinleştiriyordu."},
        {"ru": "Этот материал ценится за свою невероятную мягкость и тепло.", "tr": "Bu malzeme inanılmaz yumuşaklığı ve sıcaklığı için değer görür."},
        {"ru": "Мягкость характера часто мешала ему принимать строгие, но важные решения.", "tr": "Karakterinin yumuşaklığı, sıkı ama önemli kararlar almasını genellikle engelliyordu."}
    ],
    "544": [
        {"ru": "Твёрдость этого металла позволяет использовать его в строительстве высоких зданий.", "tr": "Bu metalin sertliği, onun yüksek binaların inşasında kullanılmasına olanak tanır."},
        {"ru": "В его голосе прозвучала неожиданная твёрдость, когда он говорил об этом.", "tr": "O bu konu hakkında konuşurken sesinde beklenmedik bir sertlik duyuldu."},
        {"ru": "Чтобы достичь успеха, необходима не только удача, но и твёрдость духа.", "tr": "Başarıya ulaşmak için sadece şans değil, aynı zamanda ruhun sertliği de gereklidir."}
    ],
    "545": [
        {"ru": "Наша вчерашняя встреча с деловыми партнёрами прошла довольно успешно.", "tr": "İş ortaklarıyla dünkü buluşmamız oldukça başarılı geçti."},
        {"ru": "Встреча выпускников была назначена на конец мая в нашем старом университете.", "tr": "Mezunlar buluşması mayıs ayının sonuna eski üniversitemizde planlanmıştı."},
        {"ru": "Каждая встреча с ним приносила мне много новых и интересных идей.", "tr": "Onunla her buluşma bana birçok yeni ve ilginç fikir getiriyordu."}
    ],
    "546": [
        {"ru": "Расставание с близкими друзьями всегда даётся мне очень тяжело.", "tr": "Yakın arkadaşlarla ayrılık bana her zaman çok zor gelir."},
        {"ru": "После долгого расставания они наконец-то встретились в аэропорту.", "tr": "Uzun bir ayrılıktan sonra nihayet havalimanında buluştular."},
        {"ru": "Их неожиданное расставание стало настоящим шоком для всех знакомых.", "tr": "Onların beklenmedik ayrılığı tüm tanıdıkları için gerçek bir şok oldu."}
    ],
    "547": [
        {"ru": "Лёгкость её движений во время танца поражала всех зрителей в зале.", "tr": "Dans sırasındaki hareketlerinin hafifliği salondaki tüm seyircileri hayrete düşürüyordu."},
        {"ru": "После долгой прогулки на свежем воздухе я почувствовал приятную лёгкость в теле.", "tr": "Temiz havada uzun bir yürüyüşten sonra vücudumda hoş bir hafiflik hissettim."},
        {"ru": "Эту задачу он решил с удивительной лёгкостью всего за пять минут.", "tr": "Bu sorunu sadece beş dakika içinde şaşırtıcı bir hafiflikle çözdü."}
    ],
    "548": [
        {"ru": "Тяжесть этих коробок была слишком большой для одного человека.", "tr": "Bu kutuların ağırlığı bir kişi için çok fazlaydı."},
        {"ru": "После долгого рабочего дня он почувствовал сильную тяжесть в ногах.", "tr": "Uzun bir iş gününden sonra bacaklarında şiddetli bir ağırlık hissetti."},
        {"ru": "Тяжесть совершенного преступления не давала ему спокойно спать по ночам.", "tr": "İşlenen suçun ağırlığı onun geceleri huzurla uyumasına izin vermiyordu."}
    ],
    "549": [
        {"ru": "Они поднялись на самый верх горы, чтобы насладиться прекрасным видом.", "tr": "Güzel manzaranın tadını çıkarmak için dağın en üstüne çıktılar."},
        {"ru": "Верх этого платья был украшен красивым кружевом и мелкими камнями.", "tr": "Bu elbisenin üstü güzel dantel ve küçük taşlarla süslenmişti."},
        {"ru": "Положи эти книги на самый верх полки, чтобы они не мешали.", "tr": "Bu kitapları engel olmamaları için rafın en üstüne koy."}
    ],
    "550": [
        {"ru": "Низ пальто был немного испачкан после прогулки по мокрым улицам.", "tr": "Paltonun altı ıslak sokaklarda yürüyüşten sonra biraz kirlenmişti."},
        {"ru": "Посмотри на низ страницы, там указан номер телефона автора.", "tr": "Sayfanın altına bak, orada yazarın telefon numarası belirtilmiş."},
        {"ru": "Низ горы был покрыт густым лесом, где водилось много диких животных.", "tr": "Dağın altı, birçok vahşi hayvanın yaşadığı sık bir ormanla kaplıydı."}
    ],
    "551": [
        {"ru": "Сладость этого десерта идеально сочетается с крепким чёрным кофе.", "tr": "Bu tatlının tatlılığı sert siyah kahveyle mükemmel uyum sağlar."},
        {"ru": "Я не очень люблю чрезмерную сладость в напитках и тортах.", "tr": "İçeceklerde ve pastalarda aşırı tatlılığı pek sevmiyorum."},
        {"ru": "Сладость победы после стольких лет упорных тренировок была непередаваемой.", "tr": "Onca yıl süren ısrarlı antrenmanlardan sonra zaferin tatlılığı tarif edilemezdi."}
    ],
    "552": [
        {"ru": "Горечь этого лекарства оставалась во рту ещё несколько часов после приёма.", "tr": "Bu ilacın acılığı, alındıktan sonra birkaç saat daha ağızda kaldı."},
        {"ru": "В его словах я почувствовал глубокую горечь от недавней неудачи.", "tr": "Sözlerinde son başarısızlıktan kaynaklanan derin bir acılık hissettim."},
        {"ru": "Легкая горечь тёмного шоколада прекрасно дополняет вкус свежей клубники.", "tr": "Bitter çikolatanın hafif acılığı taze çileğin tadını harika bir şekilde tamamlar."}
    ],
    "553": [
        {"ru": "Польза регулярных занятий спортом для здоровья человека уже давно доказана.", "tr": "Düzenli spor yapmanın insan sağlığına yararı uzun zamandır kanıtlanmıştır."},
        {"ru": "Я сомневаюсь, что от этого нового проекта будет какая-то реальная польза.", "tr": "Bu yeni projenin gerçek bir yararı olacağından şüphe duyuyorum."},
        {"ru": "Врач объяснил мне, в чём заключается польза правильного питания и диеты.", "tr": "Doktor bana doğru beslenmenin ve diyetin yararının ne olduğunu açıkladı."}
    ],
    "554": [
        {"ru": "Вред от курения для лёгких и всего организма невозможно переоценить.", "tr": "Sigara içmenin akciğerlere ve tüm vücuda zararı hafife alınamaz."},
        {"ru": "Этот завод наносит непоправимый вред окружающей среде нашего региона.", "tr": "Bu fabrika bölgemizin çevresine onarılamaz bir zarar veriyor."},
        {"ru": "Он долго не мог понять, какой вред приносят его необдуманные поступки.", "tr": "Düşüncesiz hareketlerinin ne kadar zarar getirdiğini uzun süre anlayamadı."}
    ],
    "555": [
        {"ru": "Её острый ум помогал быстро находить решения в сложных ситуациях.", "tr": "Onun keskin aklı zor durumlarda hızlıca çözüm bulmaya yardımcı oluyordu."},
        {"ru": "Многие философы считали, что ум – это главное отличие человека от животных.", "tr": "Birçok filozof aklın insanı hayvanlardan ayıran temel özellik olduğunu düşünürdü."},
        {"ru": "Чтобы понять эту сложную теорию, нужен не только опыт, но и глубокий ум.", "tr": "Bu karmaşık teoriyi anlamak için sadece tecrübe değil, aynı zamanda derin bir akıl gereklidir."}
    ],
    "556": [
        {"ru": "Он совершил большую глупость, когда отказался от такой выгодной работы.", "tr": "Böylesine kazançlı bir işi reddettiğinde büyük bir aptallık yaptı."},
        {"ru": "Эта идея казалась мне настоящей глупостью, пока я не увидел результаты.", "tr": "Sonuçları görene kadar bu fikir bana gerçek bir aptallık gibi görünüyordu."},
        {"ru": "Человеческая глупость часто становится причиной серьезных конфликтов и недопониманий.", "tr": "İnsan aptallığı genellikle ciddi çatışmaların ve yanlış anlamaların nedeni olur."}
    ],
    "557": [
        {"ru": "Его природная скромность не позволяла ему хвастаться своими достижениями.", "tr": "Onun doğal alçakgönüllülüğü başarılarıyla övünmesine izin vermiyordu."},
        {"ru": "Скромность украшает человека, но иногда мешает продвигаться по карьерной лестнице.", "tr": "Alçakgönüllülük insanı güzelleştirir ama bazen kariyer basamaklarında ilerlemeyi engeller."},
        {"ru": "Она ответила на все комплименты с изяществом и неподдельной скромностью.", "tr": "O, tüm iltifatlara zarafet ve içten bir alçakgönüllülükle cevap verdi."}
    ],
    "558": [
        {"ru": "Такое невероятное нахальство с его стороны возмутило всех присутствующих на собрании.", "tr": "Onun tarafındaki böylesine inanılmaz bir yüzsüzlük toplantıda bulunan herkesi öfkelendirdi."},
        {"ru": "Иногда небольшое нахальство помогает людям добиваться того, чего они действительно хотят.", "tr": "Bazen küçük bir yüzsüzlük, insanların gerçekten istedikleri şeyi elde etmelerine yardımcı olur."},
        {"ru": "Я просто не мог поверить в нахальство этого человека, который взял мои вещи без спроса.", "tr": "Eşyalarımı izinsiz alan bu adamın yüzsüzlüğüne inanamadım."}
    ],
    "559": [
        {"ru": "Жадность этого богатого торговца стала причиной его полного разорения.", "tr": "Bu zengin tüccarın açgözlülüğü, onun tamamen iflas etmesinin nedeni oldu."},
        {"ru": "В сказках жадность часто наказывается, а щедрость вознаграждается по заслугам.", "tr": "Masallarda açgözlülük genellikle cezalandırılır ve cömertlik hak edildiği gibi ödüllendirilir."},
        {"ru": "Его жадность не знала границ, поэтому он потерял всех своих верных друзей.", "tr": "Onun açgözlülüğü sınır tanımıyordu, bu yüzden tüm sadık arkadaşlarını kaybetti."}
    ],
    "560": [
        {"ru": "Щедрость этого человека спасла многие бедные семьи от голода прошлой зимой.", "tr": "Bu adamın cömertliği geçen kış birçok fakir aileyi açlıktan kurtardı."},
        {"ru": "Мы были искренне удивлены щедростью наших новых соседей в день праздника.", "tr": "Bayram gününde yeni komşularımızın cömertliğine içtenlikle şaşırmıştık."},
        {"ru": "Настоящая щедрость заключается в том, чтобы давать, не ожидая ничего взамен.", "tr": "Gerçek cömertlik, karşılığında hiçbir şey beklemeden vermektir."}
    ],
    "564": [
        {"ru": "Искренняя похвала учителя мотивировала мальчика учиться ещё лучше каждый день.", "tr": "Öğretmenin içten övgüsü çocuğu her gün daha iyi öğrenmeye motive ediyordu."},
        {"ru": "Вся эта незаслуженная похвала заставила меня почувствовать себя очень неловко.", "tr": "Tüm bu hak edilmemiş övgü kendimi çok rahatsız hissetmeme neden oldu."},
        {"ru": "Похвала от руководителя важна для каждого сотрудника в нашей компании.", "tr": "Yöneticinin övgüsü şirketimizdeki her çalışan için önemlidir."}
    ],
    "565": [
        {"ru": "В её строгом взгляде я прочитал явное осуждение моих недавних поступков.", "tr": "Onun sert bakışında son zamanlardaki davranışlarımın açık bir kınamasını okudum."},
        {"ru": "Публичное осуждение со стороны коллег стало для него тяжелым испытанием.", "tr": "Meslektaşları tarafından kamuya açık kınama onun için zor bir sınav oldu."},
        {"ru": "Мы не имеем права на осуждение других людей, не зная их истинных мотивов.", "tr": "Gerçek nedenlerini bilmeden başka insanları kınamaya hakkımız yok."}
    ],
    "566": [
        {"ru": "Громкий детский смех доносился из соседнего двора на протяжении всего вечера.", "tr": "Bütün akşam boyunca komşu avludan yüksek sesli çocuk gülüşü geliyordu."},
        {"ru": "Её искренний смех быстро заразил всех остальных гостей на нашей вечеринке.", "tr": "Onun içten gülüşü partimizdeki diğer tüm misafirlere hızla bulaştı."},
        {"ru": "Искренний смех считается одним из лучших способов справиться со стрессом.", "tr": "İçten gülüş, stresle başa çıkmanın en iyi yollarından biri olarak kabul edilir."}
    ],
    "567": [
        {"ru": "Горькие слёзы текли по её щекам, когда она читала это печальное письмо.", "tr": "Bu üzücü mektubu okurken acı gözyaşları yanaklarından süzülüyordu."},
        {"ru": "При виде долгожданного сына слёзы радости навернулись на глаза матери.", "tr": "Uzun zamandır beklenen oğlunu görünce annesinin gözlerine sevinç gözyaşları doldu."},
        {"ru": "Он старался скрыть свои слёзы, чтобы никто не увидел его слабости.", "tr": "Kimse onun zayıflığını görmesin diye gözyaşlarını gizlemeye çalıştı."}
    ],
    "568": [
        {"ru": "Внезапное нападение вражеских войск застало защитников города врасплох рано утром.", "tr": "Düşman birliklerinin ani saldırısı sabahın erken saatlerinde şehrin savunucularını hazırlıksız yakaladı."},
        {"ru": "Полиция расследует ночное нападение на известный банк в центре нашей столицы.", "tr": "Polis, başkentimizin merkezindeki tanınmış bir bankaya yapılan gece saldırısını araştırıyor."},
        {"ru": "Собака была натренирована так, чтобы предотвращать любое нападение на своего хозяина.", "tr": "Köpek, sahibine yönelik herhangi bir saldırıyı önleyecek şekilde eğitilmişti."}
    ],
    "569": [
        {"ru": "Крепкая оборона замка позволила жителям выдержать долгую осаду противника зимой.", "tr": "Kalenin sağlam savunması, sakinlerin kışın düşmanın uzun kuşatmasına dayanmasını sağladı."},
        {"ru": "В спорте хорошая оборона иногда важнее, чем агрессивное нападение на поле.", "tr": "Sporda iyi bir savunma bazen sahadaki agresif bir saldırıdan daha önemlidir."},
        {"ru": "Команда потратила много времени на то, чтобы выстроить надёжную линию обороны.", "tr": "Takım, güvenilir bir savunma hattı kurmak için çok zaman harcadı."}
    ],
    "570": [
        {"ru": "Яркий солнечный свет пробивался сквозь густые ветви старых деревьев в саду.", "tr": "Parlak güneş ışığı bahçedeki yaşlı ağaçların sık dalları arasından sızıyordu."},
        {"ru": "В конце длинного тёмного туннеля они наконец-то увидели спасительный свет.", "tr": "Uzun karanlık tünelin sonunda nihayet kurtarıcı ışığı gördüler."},
        {"ru": "Свет от уличного фонаря падал прямо на её красивое бледное лицо.", "tr": "Sokak lambasının ışığı doğrudan onun güzel solgun yüzüne düşüyordu."}
    ],
    "571": [
        {"ru": "Густая темнота быстро окутала весь лес после того, как солнце село.", "tr": "Güneş battıktan sonra yoğun karanlık tüm ormanı hızla sardı."},
        {"ru": "Ребёнок боялся спать один, потому что полная темнота пугала его по ночам.", "tr": "Çocuk yalnız uyumaktan korkuyordu, çünkü tam karanlık geceleri onu korkutuyordu."},
        {"ru": "В такой кромешной темноте было совершенно невозможно найти потерянные ключи от машины.", "tr": "Böylesine zifiri karanlıkta arabanın kayıp anahtarlarını bulmak tamamen imkansızdı."}
    ],
    "572": [
        {"ru": "Постоянное пьянство разрушило не только его здоровье, но и всю его семью.", "tr": "Sürekli sarhoşluk sadece sağlığını değil, tüm ailesini de mahvetti."},
        {"ru": "В этой деревне пьянство давно стало серьезной социальной проблемой для многих жителей.", "tr": "Bu köyde sarhoşluk birçok sakin için uzun zamandır ciddi bir sosyal sorun haline geldi."},
        {"ru": "Врач строго предупредил его, что дальнейшее пьянство приведёт к трагическим последствиям.", "tr": "Doktor onu daha fazla sarhoşluğun trajik sonuçlara yol açacağı konusunda kesin bir dille uyardı."}
    ],
    "573": [
        {"ru": "Трезвость ума помогла ему принять правильное решение в критической ситуации вчера вечером.", "tr": "Aklın ayıklığı, dün akşam kritik bir durumda doğru kararı almasına yardımcı oldu."},
        {"ru": "Общество анонимных алкоголиков поддерживает людей, которые выбрали полную трезвость.", "tr": "Adsız Alkolikler topluluğu tam ayıklığı seçen insanları destekler."},
        {"ru": "Трезвость водителя является обязательным условием для обеспечения безопасности на дорогах.", "tr": "Sürücünün ayıklığı yollarda güvenliği sağlamak için zorunlu bir koşuldur."}
    ],
    "574": [
        {"ru": "Его длительное отсутствие на рабочем месте вызвало подозрения у нашего начальника.", "tr": "İş yerinde uzun süreli yokluğu patronumuzda şüphe uyandırdı."},
        {"ru": "Полное отсутствие каких-либо доказательств не позволило полиции арестовать главного подозреваемого.", "tr": "Herhangi bir kanıtın tamamen yokluğu polisin baş şüpheliyi tutuklamasına izin vermedi."},
        {"ru": "В её голосе чувствовалось отсутствие интереса к этой важной теме обсуждения.", "tr": "Sesinde bu önemli tartışma konusuna karşı ilgi yokluğu hissediliyordu."}
    ],
    "575": [
        {"ru": "Твоё присутствие на этой встрече очень важно для успеха нашего общего проекта.", "tr": "Bu toplantıda senin mevcudiyetin ortak projemizin başarısı için çok önemlidir."},
        {"ru": "Собака сразу почувствовала присутствие чужого человека в нашем большом пустом доме.", "tr": "Köpek büyük boş evimizde yabancı bir adamın mevcudiyetini hemen hissetti."},
        {"ru": "Присутствие опытного врача на борту самолёта спасло жизнь одному из пассажиров.", "tr": "Uçakta deneyimli bir doktorun mevcudiyeti yolculardan birinin hayatını kurtardı."}
    ],
    "576": [
        {"ru": "Учёным пришлось опровергать старую теорию, опираясь на новые данные эксперимента.", "tr": "Bilim insanları yeni deney verilerine dayanarak eski teoriyi yalanlamak zorunda kaldılar."},
        {"ru": "Политик начал активно опровергать все слухи, появившиеся в местной прессе.", "tr": "Politikacı, yerel basında çıkan tüm söylentileri aktif olarak yalanlamaya başladı."},
        {"ru": "Нет смысла опровергать эти очевидные факты, потому что все знают правду.", "tr": "Bu açık gerçekleri yalanlamanın bir anlamı yok çünkü herkes gerçeği biliyor."}
    ],
    "577": [
        {"ru": "Адвокат пытался опровергать аргументы обвинения, используя показания надёжных свидетелей в суде.", "tr": "Avukat, mahkemede güvenilir tanıkların ifadelerini kullanarak suçlamanın argümanlarını çürütmeye çalıştı."},
        {"ru": "Чтобы опровергать такие серьёзные обвинения, вам понадобятся неопровержимые доказательства вашей невиновности.", "tr": "Böylesine ciddi suçlamaları çürütmek için masumiyetinize dair reddedilemez kanıtlara ihtiyacınız olacak."},
        {"ru": "Профессор написал большую статью, чтобы опровергать ложные выводы своих коллег.", "tr": "Profesör, meslektaşlarının yanlış sonuçlarını çürütmek için büyük bir makale yazdı."}
    ],
    "580": [
        {"ru": "Пожалуйста, иди прямо по этой улице и никуда не сворачивай.", "tr": "Lütfen bu sokak boyunca doğrudan git ve hiçbir yere sapma."},
        {"ru": "Скажи мне прямо, что ты на самом деле думаешь об этом.", "tr": "Bana bu konu hakkında gerçekten ne düşündüğünü doğrudan söyle."},
        {"ru": "Этот поезд идёт прямо в Москву без остановок на маленьких станциях.", "tr": "Bu tren küçük istasyonlarda durmadan doğrudan Moskova'ya gidiyor."}
    ],
    "581": [
        {"ru": "Его слова косвенно подтверждают, что наша первоначальная теория была абсолютно верна.", "tr": "Onun sözleri başlangıçtaki teorimizin kesinlikle doğru olduğunu dolaylı yoldan doğruluyor."},
        {"ru": "Эти новые экономические санкции косвенно повлияли на развитие малого бизнеса.", "tr": "Bu yeni ekonomik yaptırımlar küçük işletmelerin gelişimini dolaylı yoldan etkiledi."},
        {"ru": "Он ответил на мой вопрос очень уклончиво и лишь косвенно затронул суть.", "tr": "Sorumu çok kaçamak bir şekilde cevapladı ve öze sadece dolaylı yoldan değindi."}
    ]
}

with open("/Users/kagansmtdms/Downloads/Проекты/Ru-Tr-main/scripts/result_3.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=4)

print("Created result_3.json successfully.")
