import json

data = {
  "5": [
    {"ru": "Мне нужно учить эти новые слова каждый день.", "tr": "Bu yeni kelimeleri her gün ezberlemem gerekiyor."},
    {"ru": "Студенты должны учить стихи наизусть к завтрашнему уроку.", "tr": "Öğrencilerin yarına kadar şiirleri ezbere öğrenmesi gerekiyor."},
    {"ru": "Она привыкла учить тексты перед сном, чтобы лучше их запоминать.", "tr": "Metinleri daha iyi akılda tutmak için uyumadan önce ezberlemeye alışkındı."}
  ],
  "7": [
    {"ru": "Моя старшая сестра любит учить меня готовить разные блюда.", "tr": "Ablam bana farklı yemekler yapmayı öğretmeyi sever."},
    {"ru": "Преподаватель начал учить студентов новой грамматической теме.", "tr": "Öğretmen öğrencilere yeni bir gramer konusu öğretmeye başladı."},
    {"ru": "Не стоит учить взрослого человека, как ему правильно жить.", "tr": "Yetişkin birine nasıl doğru yaşayacağını öğretmeye değmez."}
  ],
  "100": [
    {"ru": "Я предпочитаю сушить волосы полотенцем, а не феном.", "tr": "Saçlarımı kurutma makinesi yerine havluyla kurutmayı tercih ederim."},
    {"ru": "После стирки мы стали сушить белье на балконе под солнцем.", "tr": "Yıkamadan sonra çamaşırları balkonda güneşin altında kurutmaya başladık."},
    {"ru": "Летом бабушка всегда любила сушить грибы и ягоды на зиму.", "tr": "Yazın büyükannem her zaman kış için mantar ve meyve kurutmayı severdi."}
  ],
  "124": [
    {"ru": "Мы договорились встретиться в центре, когда будет четверть третьего.", "tr": "Saat çeyrek geçe iki (iki on beş) olduğunda merkezde buluşmak için anlaştık."},
    {"ru": "Сейчас только пятнадцать минут третьего, у нас еще есть время.", "tr": "Şu an saat sadece ikiyi on beş geçiyor, hala vaktimiz var."},
    {"ru": "Мой поезд отправляется ровно в четверть третьего дня.", "tr": "Trenim tam öğleden sonra ikiyi çeyrek geçe kalkıyor."}
  ],
  "127": [
    {"ru": "Он обещал закончить всю работу к половине шестого вечера.", "tr": "Bütün işi akşam beş buçuğa kadar bitireceğine söz verdi."},
    {"ru": "Каждый день я выхожу из офиса в полшестого, чтобы успеть на автобус.", "tr": "Otobüse yetişmek için her gün ofisten beş buçukta çıkıyorum."},
    {"ru": "В тридцать минут шестого мы уже сидели в кафе и пили кофе.", "tr": "Saat beş otuzda çoktan kafede oturmuş kahve içiyorduk."}
  ],
  "130": [
    {"ru": "На часах было без четверти девять, когда он наконец-то пришел домой.", "tr": "Nihayet eve geldiğinde saat dokuza çeyrek vardı."},
    {"ru": "Урок начинается в без пятнадцати девять, постарайся не опаздывать.", "tr": "Ders dokuza on beş kala başlıyor, geç kalmamaya çalış."},
    {"ru": "Я обычно просыпаюсь без четверти девять и сразу иду умываться.", "tr": "Genelde dokuza çeyrek kala uyanırım ve hemen yüzümü yıkamaya giderim."}
  ],
  "311": [
    {"ru": "Во время долгой поездки на автобусе меня начало сильно тошнить.", "tr": "Uzun otobüs yolculuğu sırasında midem çok bulanmaya başladı."},
    {"ru": "Если ты съешь так много сладкого, тебя обязательно будет тошнить.", "tr": "Bu kadar çok tatlı yersen kesinlikle miden bulanır."},
    {"ru": "Ее всегда тошнит, когда она чувствует запах свежей краски.", "tr": "Taze boya kokusu aldığında her zaman midesi bulanır."}
  ],
  "318": [
    {"ru": "В русском языке мы часто образуем глаголы от прилагательных.", "tr": "Rusçada sık sık sıfatlardan fiiller türetiriz."},
    {"ru": "Студенты изучают переход слов из прилагательных в глаголы.", "tr": "Öğrenciler kelimelerin sıfattan fiile dönüşümünü inceliyorlar."},
    {"ru": "На уроке мы обсуждали способы создания глаголов от прилагательных.", "tr": "Derste sıfatlardan fiil oluşturma yöntemlerini tartıştık."}
  ],
  "361": [
    {"ru": "Он говорил так уверенно, как будто знал все заранее.", "tr": "O kadar emin konuşuyordu ki, sanki her şeyi önceden biliyormuş gibi."},
    {"ru": "На улице стало так темно, словно уже наступила глубокая ночь.", "tr": "Dışarısı o kadar karardı ki, sanki gece yarısı olmuş gibi."},
    {"ru": "Она смотрела на меня, как будто мы никогда раньше не встречались.", "tr": "Sanki daha önce hiç tanışmamışız gibi bana bakıyordu."}
  ],
  "490": [
    {"ru": "Мой дедушка был очень щедрый и всегда помогал нуждающимся.", "tr": "Büyükbabam çok cömertti ve her zaman ihtiyacı olanlara yardım ederdi."},
    {"ru": "Этот бизнесмен известен тем, что он щедрый меценат для искусства.", "tr": "Bu iş adamı sanat için cömert bir hayırsever olmasıyla tanınır."},
    {"ru": "Только щедрый человек способен отдать свои последние деньги другу.", "tr": "Sadece cömert bir insan son parasını arkadaşına verebilir."}
  ],
  "498": [
    {"ru": "Лед на озере был слишком тонкий, поэтому мы не стали кататься.", "tr": "Göldeki buz çok inceydi, bu yüzden kaymaya gitmedik."},
    {"ru": "Ее пальцы были такие длинные и тонкие, как у настоящей пианистки.", "tr": "Parmakları gerçek bir piyanistinki gibi uzun ve inceydi."},
    {"ru": "Он нарезал сыр на тонкие ломтики для нашего утреннего бутерброда.", "tr": "Sabah sandviçimiz için peyniri ince dilimler halinde kesti."}
  ],
  "503": [
    {"ru": "После сильного дождя на деревенской дороге была сплошная грязь.", "tr": "Şiddetli yağmurdan sonra köy yolunda tamamen çamur (kir) vardı."},
    {"ru": "Не стоит наступать в эту грязь, чтобы не испортить новые ботинки.", "tr": "Yeni ayakkabılarını mahvetmemek için bu kire basmamalısın."},
    {"ru": "Мальчик вернулся с улицы домой, и на его лице была грязь.", "tr": "Çocuk sokaktan eve döndü ve yüzünde kir vardı."}
  ],
  "506": [
    {"ru": "Иногда лень мешает нам достигать тех целей, которые мы ставим.", "tr": "Bazen tembellik belirlediğimiz hedeflere ulaşmamızı engeller."},
    {"ru": "Его постоянная лень стала причиной проблем на новой работе.", "tr": "Sürekli tembelliği yeni işinde sorunların nedeni oldu."},
    {"ru": "Она смогла побороть свою лень и начала заниматься спортом каждое утро.", "tr": "Tembelliğini yenmeyi başardı ve her sabah spor yapmaya başladı."}
  ],
  "518": [
    {"ru": "В июле на юге стояла невыносимая жара, от которой трудно было спрятаться.", "tr": "Temmuz ayında güneyde saklanması zor, dayanılmaz bir sıcak vardı."},
    {"ru": "Из-за сильной жары все растения в нашем саду начали быстро засыхать.", "tr": "Aşırı sıcaklar yüzünden bahçemizdeki tüm bitkiler hızla kurumaya başladı."},
    {"ru": "Летняя жара заставляла людей проводить все свободное время у воды.", "tr": "Yaz sıcağı insanları tüm boş zamanlarını su kenarında geçirmeye zorluyordu."}
  ],
  "521": [
    {"ru": "Жизнь в большом городе всегда полна разных интересных событий.", "tr": "Büyük bir şehirde yaşam her zaman çeşitli ilginç olaylarla doludur."},
    {"ru": "Ее главная мечта — прожить счастливую и долгую жизнь в окружении семьи.", "tr": "En büyük hayali, ailesiyle çevrili mutlu ve uzun bir yaşam sürmektir."},
    {"ru": "Иногда жизнь преподносит нам сюрпризы, к которым мы совершенно не готовы.", "tr": "Bazen yaşam bize hiç hazır olmadığımız sürprizler sunar."}
  ],
  "523": [
    {"ru": "У этого спортсмена была невероятная физическая сила и выносливость.", "tr": "Bu sporcunun inanılmaz bir fiziksel gücü ve dayanıklılığı vardı."},
    {"ru": "Чтобы пережить эти трудные времена, нам понадобится огромная сила воли.", "tr": "Bu zor zamanları atlatmak için muazzam bir irade gücüne ihtiyacımız olacak."},
    {"ru": "Вода обладает разрушительной силой во время сильного весеннего наводнения.", "tr": "Şiddetli bahar seli sırasında suyun yıkıcı bir gücü vardır."}
  ],
  "592": [
    {"ru": "В старом пруду вода была слишком мутной, чтобы в ней купаться.", "tr": "Eski göletteki su yüzmek için çok bulanıktı."},
    {"ru": "Его ответ показался мне довольно мутным и не совсем понятным.", "tr": "Onun cevabı bana oldukça bulanık (belirsiz) ve tam olarak anlaşılamaz geldi."},
    {"ru": "Через мутное стекло старого окна мы едва могли разглядеть улицу.", "tr": "Eski pencerenin bulanık camından sokağı zar zor seçebiliyorduk."}
  ],
  "598": [
    {"ru": "Этот тропический остров казался настоящим раем для всех туристов.", "tr": "Bu tropik ada tüm turistler için gerçek bir cennet gibi görünüyordu."},
    {"ru": "Она мечтала о том, чтобы после смерти попасть в светлый рай.", "tr": "Öldükten sonra aydınlık cennete gitmeyi hayal ediyordu."},
    {"ru": "Их новый дом за городом был похож на тихий и уютный рай.", "tr": "Şehir dışındaki yeni evleri sessiz ve rahat bir cennete benziyordu."}
  ],
  "1181": [
    {"ru": "Главный герой этого романа преодолел множество опасных препятствий.", "tr": "Bu romanın ana kahramanı birçok tehlikeli engeli aştı."},
    {"ru": "Для маленького мальчика его отец всегда был самым настоящим героем.", "tr": "Küçük bir çocuk için babası her zaman gerçek bir kahramandı."},
    {"ru": "Пожарный, который спас ребенка из огня, стал местным героем.", "tr": "Çocuğu ateşten kurtaran itfaiyeci yerel bir kahraman oldu."}
  ],
  "1226": [
    {"ru": "Она всегда любила утрировать проблемы, когда рассказывала истории.", "tr": "Hikaye anlatırken sorunları her zaman abartmayı severdi."},
    {"ru": "Не стоит утрировать ситуацию, все не так плохо, как кажется.", "tr": "Durumu abartmaya değmez, her şey göründüğü kadar kötü değil."},
    {"ru": "Журналисты часто пытаются утрировать факты ради громкого заголовка.", "tr": "Gazeteciler çoğu zaman çarpıcı bir manşet uğruna gerçekleri abartmaya çalışırlar."}
  ],
  "1353": [
    {"ru": "Мой старый дружок зашел в гости, чтобы обсудить наши школьные годы.", "tr": "Eski arkadaşım okul yıllarımızı konuşmak için ziyarete geldi."},
    {"ru": "Мы с моим верным дружком отправились в долгое путешествие на машине.", "tr": "Sadık arkadaşımla arabayla uzun bir yolculuğa çıktık."},
    {"ru": "Этот маленький дружок всегда поддерживал меня в трудные моменты.", "tr": "Bu küçük arkadaşım zor zamanlarımda beni her zaman destekledi."}
  ],
  "1384": [
    {"ru": "Известный танцовщик выступил на сцене большого театра с новой программой.", "tr": "Ünlü dansçı büyük tiyatronun sahnesinde yeni bir programla performans sergiledi."},
    {"ru": "Он мечтал стать профессиональным танцовщиком и много тренировался каждый день.", "tr": "Profesyonel bir dansçı olmayı hayal ediyordu ve her gün çok antrenman yapıyordu."},
    {"ru": "Талантливый танцовщик поразил всех зрителей своими невероятными движениями.", "tr": "Yetenekli dansçı inanılmaz hareketleriyle tüm seyircileri büyüledi."}
  ],
  "1388": [
    {"ru": "Великий мыслитель древности оставил после себя множество философских трудов.", "tr": "Antik çağın büyük düşünürü geride birçok felsefi eser bıraktı."},
    {"ru": "Современный мыслитель пытается найти ответы на сложные вопросы общества.", "tr": "Modern düşünür, toplumun karmaşık sorularına cevap bulmaya çalışıyor."},
    {"ru": "Каждый известный мыслитель вносил свой вклад в развитие мировой науки.", "tr": "Her ünlü düşünür dünya biliminin gelişimine katkıda bulunmuştur."}
  ],
  "1390": [
    {"ru": "Спасатель быстро прыгнул в воду, чтобы помочь тонущему человеку.", "tr": "Kurtarıcı, boğulan kişiye yardım etmek için hızla suya atladı."},
    {"ru": "Опытный спасатель рассказал детям о правилах безопасности на пляже.", "tr": "Deneyimli kurtarıcı, çocuklara plajdaki güvenlik kurallarını anlattı."},
    {"ru": "Быть спасателем — это очень ответственная и опасная профессия.", "tr": "Kurtarıcı olmak çok sorumlu ve tehlikeli bir meslektir."}
  ],
  "1392": [
    {"ru": "В нашем классе всегда был один главный шутник, который веселил всех.", "tr": "Sınıfımızda her zaman herkesi eğlendiren bir ana şakacı vardı."},
    {"ru": "Этот шутник снова придумал забавную историю, чтобы рассмешить коллег.", "tr": "Bu şakacı yine meslektaşlarını güldürmek için komik bir hikaye uydurdu."},
    {"ru": "Иногда слова шутника могут случайно обидеть слишком серьезного человека.", "tr": "Bazen bir şakacının sözleri çok ciddi birini kazara kırabilir."}
  ],
  "1394": [
    {"ru": "Известный путешественник написал книгу о своих приключениях в Африке.", "tr": "Ünlü gezgin Afrika'daki maceraları hakkında bir kitap yazdı."},
    {"ru": "Каждый настоящий путешественник мечтает посетить самые отдаленные уголки мира.", "tr": "Her gerçek gezgin, dünyanın en ücra köşelerini ziyaret etmeyi hayal eder."},
    {"ru": "Мой брат — заядлый путешественник, он объездил уже половину Европы.", "tr": "Erkek kardeşim hevesli bir gezgindir, zaten Avrupa'nın yarısını gezdi."}
  ],
  "1396": [
    {"ru": "Этот человек оказался ловким обманщиком, который забрал наши деньги.", "tr": "Bu adamın paramızı alan kurnaz bir sahtekar olduğu ortaya çıktı."},
    {"ru": "Никто не любит обманщиков, потому что им невозможно доверять в делах.", "tr": "Kimse dolandırıcıları sevmez, çünkü onlara iş konusunda güvenmek imkansızdır."},
    {"ru": "Молодой обманщик попытался продать нам поддельную картину под видом оригинала.", "tr": "Genç sahtekar bize orijinal kisvesi altında sahte bir tablo satmaya çalıştı."}
  ],
  "1398": [
    {"ru": "Военный лётчик успешно выполнил сложное задание во время учений.", "tr": "Askeri pilot, tatbikatlar sırasında zor bir görevi başarıyla tamamladı."},
    {"ru": "С самого детства он мечтал стать лётчиком и управлять огромным самолетом.", "tr": "Çocukluğundan beri pilot olmayı ve devasa bir uçağı uçurmayı hayal ediyordu."},
    {"ru": "Опытный лётчик смог благополучно посадить самолет в плохую погоду.", "tr": "Deneyimli pilot, uçağı kötü havada güvenli bir şekilde indirmeyi başardı."}
  ],
  "1400": [
    {"ru": "Добросовестный плательщик всегда вовремя оплачивает все свои коммунальные счета.", "tr": "Vicdanlı bir mükellef her zaman tüm elektrik/su faturalarını zamanında öder."},
    {"ru": "Банк предлагает выгодные условия кредита, если вы надежный плательщик.", "tr": "Güvenilir bir mükellefseniz, banka uygun kredi koşulları sunar."},
    {"ru": "Государство поощряет каждого плательщика налогов специальными социальными льготами.", "tr": "Devlet, her vergi mükellefini özel sosyal yardımlarla teşvik eder."}
  ],
  "1402": [
    {"ru": "В старом деревенском доме стоял умывальник с холодной колодезной водой.", "tr": "Eski köy evinde soğuk kuyu suyu olan bir lavabo vardı."},
    {"ru": "Она подошла к умывальнику, чтобы смыть с рук пыль после работы.", "tr": "İşten sonra ellerindeki tozu yıkamak için lavaboya gitti."},
    {"ru": "Этот керамический умывальник идеально подошел к интерьеру нашей новой ванной.", "tr": "Bu seramik lavabo, yeni banyomuzun iç mekanıyla mükemmel uyum sağladı."}
  ]
}

with open("/Users/kagansmtdms/Downloads/Проекты/Ru-Tr-main/scripts/result_0.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
