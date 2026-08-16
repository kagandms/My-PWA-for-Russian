import json

data = {
  "703": [
    {"ru": "В магазине на всех товарах был указан неправильный ценник.", "tr": "Mağazada tüm ürünlerin üzerinde yanlış fiyat etiketi vardı."},
    {"ru": "Я долго искал ценник, чтобы узнать стоимость этой красивой рубашки.", "tr": "Bu güzel gömleğin fiyatını öğrenmek için uzun süre fiyat etiketini aradım."},
    {"ru": "Продавец быстро поменял старый ценник на новый перед открытием магазина.", "tr": "Satıcı, mağaza açılmadan önce eski fiyat etiketini hızla yenisiyle değiştirdi."}
  ],
  "793": [
    {"ru": "Он читал интересную книгу, а она внимательно слушала музыку.", "tr": "O ilginç bir kitap okuyordu, o ise dikkatlice müzik dinliyordu."},
    {"ru": "Мы решили пойти в кино, а наши друзья остались дома.", "tr": "Biz sinemaya gitmeye karar verdik, arkadaşlarımız ise evde kaldı."},
    {"ru": "Я люблю пить горячий чай, а мой брат предпочитает кофе.", "tr": "Ben sıcak çay içmeyi severim, kardeşim ise kahveyi tercih eder."}
  ],
  "1114": [
    {"ru": "Истинная любовь преодолевает все преграды на своем жизненном пути.", "tr": "Gerçek aşk, hayat yolundaki tüm engelleri aşar."},
    {"ru": "Их долгая любовь стала примером для многих молодых пар.", "tr": "Onların uzun süren aşkı, birçok genç çifte örnek oldu."},
    {"ru": "Она верила, что настоящая любовь существует и когда-нибудь придет.", "tr": "O, gerçek aşkın var olduğuna ve bir gün geleceğine inanıyordu."}
  ],
  "1116": [
    {"ru": "Работники выразили свое недовольство новыми правилами в офисе компании.", "tr": "Çalışanlar, şirketin ofisindeki yeni kurallara yönelik memnuniyetsizliklerini ifade ettiler."},
    {"ru": "Постоянное недовольство клиента мешало нам завершить важный проект вовремя.", "tr": "Müşterinin sürekli memnuniyetsizliği, önemli projeyi zamanında bitirmemize engel oldu."},
    {"ru": "В его голосе ясно слышалось недовольство из-за долгого ожидания.", "tr": "Uzun bekleyiş yüzünden sesinde açıkça bir memnuniyetsizlik duyuluyordu."}
  ],
  "1118": [
    {"ru": "Он абсолютно спокойно отреагировал на внезапное изменение нашего расписания.", "tr": "Programımızdaki ani değişikliğe tamamen sakin bir şekilde tepki verdi."},
    {"ru": "Мы должны спокойно обсудить эту сложную ситуацию без лишних эмоций.", "tr": "Bu zor durumu gereksiz duygular olmadan sakin bir şekilde tartışmalıyız."},
    {"ru": "Собака лежала на ковре и спокойно смотрела на проходящих людей.", "tr": "Köpek halının üzerinde yatıyor ve yoldan geçen insanlara sakin bir şekilde bakıyordu."}
  ],
  "1120": [
    {"ru": "Хороший юмор помогает справляться с трудностями в повседневной жизни.", "tr": "İyi bir mizah, günlük hayattaki zorlukların üstesinden gelmeye yardımcı olur."},
    {"ru": "Его тонкий юмор всегда поднимает настроение всей нашей компании.", "tr": "Onun ince mizahı her zaman tüm grubumuzun moralini yükseltir."},
    {"ru": "В этом фильме присутствует отличный юмор, который понравится всем зрителям.", "tr": "Bu filmde tüm izleyicilerin hoşuna gidecek harika bir mizah var."}
  ],
  "1122": [
    {"ru": "Я решил взять с собой зонт, потому что обещали дождь.", "tr": "Yağmur yağacağı söylendiği için yanıma şemsiye almaya karar verdim."},
    {"ru": "Можешь взять мою машину, если тебе нужно срочно поехать.", "tr": "Eğer acilen gitmen gerekiyorsa arabamı alabilirsin."},
    {"ru": "Она забыла взять ключи от квартиры и осталась на улице.", "tr": "Dairenin anahtarlarını almayı unuttu ve dışarıda kaldı."}
  ],
  "1125": [
    {"ru": "Не стоит долго печалиться из-за мелких неудач на работе.", "tr": "İşteki küçük başarısızlıklar yüzünden uzun süre kederlenmeye değmez."},
    {"ru": "Она начала печалиться, когда узнала о внезапном отъезде своего друга.", "tr": "Arkadaşının ani ayrılışını öğrendiğinde kederlenmeye başladı."},
    {"ru": "Мы не должны печалиться о прошлом, лучше смотреть в будущее.", "tr": "Geçmiş için kederlenmemeliyiz, geleceğe bakmak daha iyidir."}
  ],
  "1127": [
    {"ru": "Завтра начнется важная международная конференция по вопросам экологии и климата.", "tr": "Yarın ekoloji ve iklim konularında önemli bir uluslararası konferans başlayacak."},
    {"ru": "Научная конференция собрала специалистов из разных стран для обсуждения проблем.", "tr": "Bilimsel konferans, sorunları tartışmak için farklı ülkelerden uzmanları bir araya getirdi."},
    {"ru": "Вчера я выступал с докладом, когда проходила ежегодная медицинская конференция.", "tr": "Dün yıllık tıp konferansı gerçekleşirken bir sunum yaptım."}
  ],
  "1129": [
    {"ru": "Густая темнота быстро окутала лес после захода яркого солнца.", "tr": "Parlak güneş battıktan sonra yoğun karanlık ormanı hızla sardı."},
    {"ru": "Многие дети боятся, когда в комнате наступает полная темнота.", "tr": "Birçok çocuk odada tam karanlık çöktüğünde korkar."},
    {"ru": "Темнота мешала нам найти правильную дорогу к нашему дому.", "tr": "Karanlık, evimize giden doğru yolu bulmamızı engelledi."}
  ],
  "1134": [
    {"ru": "Мальчик мог упасть с высокого дерева, если бы не осторожность.", "tr": "Eğer dikkatli olmasaydı, çocuk yüksek ağaçtan düşebilirdi."},
    {"ru": "Цены на недвижимость могут резко упасть в следующем году.", "tr": "Gayrimenkul fiyatları gelecek yıl aniden düşebilir."},
    {"ru": "Ваза чуть не успела упасть со стола, но я поймал её.", "tr": "Vazo az kalsın masadan düşüyordu ama ben onu yakaladım."}
  ],
  "1136": [
    {"ru": "В древних легендах этот могущественный повелитель управлял всеми стихиями.", "tr": "Eski efsanelerde bu güçlü hükümdar tüm elementleri yönetiyordu."},
    {"ru": "Жестокий повелитель не слушал советы своих верных и мудрых слуг.", "tr": "Zalim hükümdar, sadık ve bilge hizmetkarlarının tavsiyelerini dinlemedi."},
    {"ru": "Народ надеялся, что новый повелитель принесет мир в их земли.", "tr": "Halk, yeni hükümdarın topraklarına barış getirmesini umuyordu."}
  ],
  "1138": [
    {"ru": "Главный недостаток этого плана заключается в его высокой стоимости.", "tr": "Bu planın temel eksikliği, maliyetinin yüksek olmasıdır."},
    {"ru": "У каждого человека есть хотя бы один серьезный недостаток характера.", "tr": "Her insanın karakterinde en az bir ciddi eksiklik vardır."},
    {"ru": "Недостаток опыта не помешал ему получить эту перспективную работу.", "tr": "Deneyim eksikliği, bu umut verici işi almasına engel olmadı."}
  ],
  "1140": [
    {"ru": "Мне пришлось рано встать, чтобы успеть на первый утренний поезд.", "tr": "Sabahki ilk trene yetişmek için erken kalkmak zorunda kaldım."},
    {"ru": "Он не мог встать с кровати из-за сильной боли в спине.", "tr": "Sırtındaki şiddetli ağrı nedeniyle yataktan kalkamıyordu."},
    {"ru": "После падения она смогла быстро встать и продолжить свой путь.", "tr": "Düştükten sonra hızla kalkmayı ve yoluna devam etmeyi başardı."}
  ],
  "1143": [
    {"ru": "Он не смог сдержать свой сильный гнев во время жаркого спора.", "tr": "Hararetli tartışma sırasında şiddetli gazabını kontrol edemedi."},
    {"ru": "Её гнев был вызван несправедливым решением руководства нашей крупной компании.", "tr": "Onun gazabı, büyük şirketimizin yönetiminin haksız kararından kaynaklanıyordu."},
    {"ru": "Лучше успокоиться и подождать, пока пройдет этот внезапный приступ гнева.", "tr": "Sakinleşmek ve bu ani gazap krizinin geçmesini beklemek daha iyidir."}
  ],
  "1146": [
    {"ru": "Гордый человек никогда не станет унижаться перед своими врагами.", "tr": "Gururlu bir insan asla düşmanlarının önünde aşağılanmaz."},
    {"ru": "Ей пришлось унижаться, чтобы получить эту работу после долгого перерыва.", "tr": "Uzun bir aradan sonra bu işi almak için aşağılanmak zorunda kaldı."},
    {"ru": "Я не хочу унижаться и просить о помощи у незнакомых людей.", "tr": "Aşağılanmak ve tanımadığım insanlardan yardım istemek istemiyorum."}
  ],
  "1147": [
    {"ru": "Новый сотрудник начал постоянно заискивать перед нашим строгим начальником.", "tr": "Yeni çalışan, sert patronumuza sürekli yaltaklanmaya başladı."},
    {"ru": "Я терпеть не могу людей, которые привыкли заискивать ради выгоды.", "tr": "Çıkar uğruna yaltaklanmaya alışmış insanlara tahammül edemiyorum."},
    {"ru": "Ему не пришлось заискивать, так как его талант был очевиден.", "tr": "Yeteneği ortada olduğu için yaltaklanmak zorunda kalmadı."}
  ],
  "1149": [
    {"ru": "Моя младшая сестра продолжает обожать шоколадное мороженое с орехами.", "tr": "Küçük kız kardeşim fındıklı çikolatalı dondurmaya bayılmaya devam ediyor."},
    {"ru": "Зрители начали обожать этого актера после его роли в известном фильме.", "tr": "İzleyiciler, ünlü filmdeki rolünden sonra bu aktöre bayılmaya başladılar."},
    {"ru": "Я всегда буду обожать гулять по тихим улицам старого города.", "tr": "Eski şehrin sessiz sokaklarında yürümeye her zaman bayılacağım."}
  ],
  "1151": [
    {"ru": "Между бывшими коллегами возникла открытая неприязнь после того конфликта.", "tr": "O çatışmadan sonra eski meslektaşlar arasında açık bir nefret oluştu."},
    {"ru": "Она пыталась скрыть свою личную неприязнь к новому соседу по комнате.", "tr": "Yeni oda arkadaşına olan kişisel nefretini gizlemeye çalıştı."},
    {"ru": "Его неприязнь к громкой музыке мешала ему посещать современные концерты.", "tr": "Yüksek sesli müziğe olan nefreti, modern konserlere gitmesini engelliyordu."}
  ],
  "1153": [
    {"ru": "Вчера он был очень злой из-за проблем с его личным автомобилем.", "tr": "Dün kişisel arabasındaki sorunlar yüzünden çok kötüydü."},
    {"ru": "Злой ветер срывал желтые листья с деревьев в осеннем парке.", "tr": "Kötü rüzgar, sonbahar parkındaki ağaçlardan sarı yaprakları koparıyordu."},
    {"ru": "Я не думаю, что он злой человек, просто у него сложный характер.", "tr": "Onun kötü bir insan olduğunu düşünmüyorum, sadece zor bir karakteri var."}
  ],
  "1155": [
    {"ru": "Общество склонно строго осуждать людей за их прошлые ошибки.", "tr": "Toplum, insanları geçmiş hatalarından dolayı sert bir şekilde kınamaya eğilimlidir."},
    {"ru": "Не стоит осуждать её выбор, не зная всех важных обстоятельств.", "tr": "Tüm önemli koşulları bilmeden onun seçimini kınamaya değmez."},
    {"ru": "Коллеги начали осуждать его поведение на последнем корпоративном мероприятии.", "tr": "Meslektaşları, son kurumsal etkinlikteki davranışını kınamaya başladılar."}
  ],
  "1157": [
    {"ru": "Эту сложную математическую задачу можно решить довольно просто и быстро.", "tr": "Bu zor matematik problemini oldukça basit ve hızlı bir şekilde çözebilirsiniz."},
    {"ru": "Она хотела просто отдохнуть после тяжелой рабочей недели в офисе.", "tr": "Zorlu bir ofis çalışma haftasından sonra basitçe dinlenmek istiyordu."},
    {"ru": "Мне просто нужно немного времени, чтобы всё тщательно обдумать.", "tr": "Her şeyi iyice düşünmek için basitçe biraz zamana ihtiyacım var."}
  ],
  "1159": [
    {"ru": "Дети любят собирать красивые ракушки на песчаном берегу моря.", "tr": "Çocuklar, kumlu deniz kıyısında güzel deniz kabukları toplamayı severler."},
    {"ru": "Осенью мы обычно ходим в лес собирать грибы и сладкие ягоды.", "tr": "Sonbaharda genellikle ormana mantar ve tatlı meyveler toplamaya gideriz."},
    {"ru": "Ему нравится собирать старинные монеты и редкие почтовые марки.", "tr": "Eski paraları ve nadir posta pullarını toplamayı seviyor."}
  ],
  "1161": [
    {"ru": "Этот старый документ является отличным образцом литературы того времени.", "tr": "Bu eski belge, o dönemin edebiyatının harika bir örneğidir."},
    {"ru": "На выставке был представлен новый образец современного технологичного оборудования.", "tr": "Sergide modern teknolojik ekipmanın yeni bir örneği sunuldu."},
    {"ru": "Мастер показал ученикам идеальный образец выполнения этой сложной работы.", "tr": "Usta, öğrencilere bu zor işin mükemmel bir örneğini gösterdi."}
  ],
  "1163": [
    {"ru": "Экскурсовод начал показывать туристам самые известные исторические памятники города.", "tr": "Rehber, turistlere şehrin en ünlü tarihi anıtlarını göstermeye başladı."},
    {"ru": "Я не люблю показывать свои эмоции перед совершенно незнакомыми людьми.", "tr": "Tamamen yabancı insanların önünde duygularımı göstermeyi sevmiyorum."},
    {"ru": "Телевизор перестал показывать мои любимые каналы из-за сильной грозы.", "tr": "Şiddetli fırtına yüzünden televizyon en sevdiğim kanalları göstermeyi bıraktı."}
  ],
  "1165": [
    {"ru": "Это сложное предложение состоит из нескольких важных грамматических частей.", "tr": "Bu karmaşık cümle, birkaç önemli dilbilgisel bölümden oluşmaktadır."},
    {"ru": "Учитель попросил ученика составить новое предложение с этим трудным словом.", "tr": "Öğretmen, öğrenciden bu zor kelimeyle yeni bir cümle kurmasını istedi."},
    {"ru": "Переводчик должен правильно перевести каждое предложение в этом длинном тексте.", "tr": "Çevirmen, bu uzun metindeki her cümleyi doğru bir şekilde çevirmelidir."}
  ],
  "1167": [
    {"ru": "Актер блестяще прочитал небольшой отрывок из известного классического романа.", "tr": "Aktör, ünlü klasik romandan küçük bir alıntıyı mükemmel bir şekilde okudu."},
    {"ru": "Этот музыкальный отрывок всегда вызывает у меня очень сильные чувства.", "tr": "Bu müzikal alıntı bende her zaman çok güçlü duygular uyandırır."},
    {"ru": "Мы проанализировали важный отрывок текста на уроке русской литературы.", "tr": "Rus edebiyatı dersinde metnin önemli bir alıntısını analiz ettik."}
  ],
  "1169": [
    {"ru": "Эта интересная мысль внезапно пришла мне в голову во время утренней прогулки.", "tr": "Bu ilginç düşünce, sabah yürüyüşü sırasında aniden aklıma geldi."},
    {"ru": "Его главная мысль заключалась в том, что нужно всегда развиваться.", "tr": "Onun ana düşüncesi, her zaman gelişmek gerektiğiydi."},
    {"ru": "Я не могу понять, какая мысль скрыта в этом стихотворении.", "tr": "Bu şiirde hangi düşüncenin gizli olduğunu anlayamıyorum."}
  ],
  "1171": [
    {"ru": "Студенты начали усиленно готовиться к предстоящим сложным выпускным экзаменам.", "tr": "Öğrenciler, yaklaşan zorlu mezuniyet sınavlarına yoğun bir şekilde hazırlanmaya başladılar."},
    {"ru": "Спасатели усиленно искали потерявшихся туристов в густом темном лесу.", "tr": "Kurtarıcılar, kayıp turistleri yoğun karanlık ormanda yoğun bir şekilde aradılar."},
    {"ru": "Он усиленно тренировался каждый день, чтобы выиграть эти важные соревнования.", "tr": "Bu önemli yarışmaları kazanmak için her gün yoğun bir şekilde antrenman yaptı."}
  ],
  "1173": [
    {"ru": "Опытный экскурсовод рассказал нам много интересных фактов об этом замке.", "tr": "Deneyimli rehber, bize bu kale hakkında birçok ilginç gerçek anlattı."},
    {"ru": "Наш экскурсовод отлично говорил по-английски и шутил с туристами.", "tr": "Rehberimiz mükemmel İngilizce konuşuyor ve turistlerle şakalaşıyordu."},
    {"ru": "Молодой экскурсовод показал группе скрытые от обычных глаз места.", "tr": "Genç rehber, gruba normal gözlerden gizlenmiş yerleri gösterdi."}
  ],
  "1175": [
    {"ru": "Это был самый лучший день в моей долгой и интересной жизни.", "tr": "Bu, uzun ve ilginç hayatımın en iyi günüydü."},
    {"ru": "Мой лучший друг всегда поддерживает меня в трудных жизненных ситуациях.", "tr": "En iyi arkadaşım, zor yaşam durumlarında beni her zaman destekler."},
    {"ru": "Мы выбрали лучший ресторан в городе для празднования нашего юбилея.", "tr": "Yıldönümümüzü kutlamak için şehirdeki en iyi restoranı seçtik."}
  ],
  "1177": [
    {"ru": "Мы планируем провести эти выходные за городом, на свежем воздухе.", "tr": "Bu hafta sonunu şehrin dışında, temiz havada geçirmeyi planlıyoruz."},
    {"ru": "Прошлые выходные были очень насыщенными и полными ярких событий.", "tr": "Geçen hafta sonu çok yoğun ve renkli etkinliklerle doluydu."},
    {"ru": "Я люблю, когда выходные проходят спокойно, без спешки и суеты.", "tr": "Hafta sonunun acele etmeden ve telaşsız bir şekilde sakin geçmesini seviyorum."}
  ],
  "1179": [
    {"ru": "В русском языке окончание слова может меняться в зависимости от падежа.", "tr": "Rusçada kelimenin eki duruma göre değişebilir."},
    {"ru": "Учитель объяснил, как правильно писать окончание в этих глаголах.", "tr": "Öğretmen, bu fiillerde ekin nasıl doğru yazılacağını açıkladı."},
    {"ru": "Она сделала ошибку, когда определяла окончание в новом существительном.", "tr": "Yeni ismin ekini belirlerken bir hata yaptı."}
  ],
  "1181": [
    {"ru": "Главный герой этого фильма спасает мир от глобальной катастрофы.", "tr": "Bu filmin ana kahramanı dünyayı küresel bir felaketten kurtarıyor."},
    {"ru": "Мой дедушка — настоящий герой, который прошел через все испытания войны.", "tr": "Büyükbabam, savaşın tüm zorluklarından geçmiş gerçek bir kahramandır."},
    {"ru": "Каждый ребенок хочет быть похожим на своего любимого сказочного героя.", "tr": "Her çocuk en sevdiği masal kahramanına benzemek ister."}
  ],
  "1183": [
    {"ru": "Содержание этой книги оказалось гораздо интереснее, чем я думал.", "tr": "Bu kitabın içeriği düşündüğümden çok daha ilginç çıktı."},
    {"ru": "Мы обсудили краткое содержание статьи на вчерашнем важном семинаре.", "tr": "Dünkü önemli seminerde makalenin kısa içeriğini tartıştık."},
    {"ru": "Учитель попросил учеников пересказать содержание прочитанного текста своими словами.", "tr": "Öğretmen, öğrencilerden okudukları metnin içeriğini kendi kelimeleriyle özetlemelerini istedi."}
  ]
}

with open('/Users/kagansmtdms/Downloads/Проекты/Ru-Tr-main/scripts/result_5.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Generated result_5.json successfully")
