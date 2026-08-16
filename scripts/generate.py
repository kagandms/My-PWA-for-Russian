import json

data = {
    "1404": [
        {"ru": "На пляже было так много людей, что найти свободный лежак оказалось сложной задачей.", "tr": "Plajda o kadar çok insan vardı ki boş bir şezlong bulmak zor bir görev oldu."},
        {"ru": "После долгого плавания я с удовольствием прилёг на удобный деревянный лежак.", "tr": "Uzun bir yüzmeden sonra rahat ahşap bir şezlonga uzanmaktan keyif aldım."},
        {"ru": "Они арендовали зонтик и лежак на весь день, чтобы наслаждаться солнцем у бассейна.", "tr": "Havuz kenarında güneşin tadını çıkarmak için bütün günlüğüne bir şemsiye ve şezlong kiraladılar."}
    ],
    "1408": [
        {"ru": "Мой дедушка — настоящий знаток антикварной мебели, он может определить эпоху с первого взгляда.", "tr": "Büyükbabam antika mobilyalar konusunda gerçek bir uzmandır, dönemi ilk bakışta belirleyebilir."},
        {"ru": "Этот ресторан посещают в основном местные знатоки хорошей итальянской кухни.", "tr": "Bu restoranı çoğunlukla iyi İtalyan mutfağının yerel uzmanları ziyaret eder."},
        {"ru": "Только опытный знаток искусства способен отличить оригинал картины от качественной подделки.", "tr": "Sadece deneyimli bir sanat uzmanı, tablonun orijinalini kaliteli bir sahtesinden ayırabilir."}
    ],
    "1410": [
        {"ru": "Её ежемесячный заработок значительно увеличился после того, как она получила повышение на работе.", "tr": "İş yerinde terfi aldıktan sonra aylık kazancı önemli ölçüde arttı."},
        {"ru": "В студенческие годы он искал дополнительный заработок в интернете по вечерам.", "tr": "Öğrencilik yıllarında akşamları internette ek kazanç arıyordu."},
        {"ru": "Основной заработок этой семьи зависит от продажи сельскохозяйственной продукции на местном рынке.", "tr": "Bu ailenin ana kazancı, yerel pazarda tarım ürünleri satmasına bağlıdır."}
    ],
    "1411": [
        {"ru": "Зимой мы каждые выходные ходим на открытый каток в центральном парке нашего города.", "tr": "Kışın her hafta sonu şehrimizin merkez parkındaki açık buz pistine gideriz."},
        {"ru": "Городской каток был залит идеально ровно, поэтому кататься на коньках было одно удовольствие.", "tr": "Şehir buz pisti mükemmel derecede pürüzsüz bir şekilde dökülmüştü, bu yüzden paten kaymak bir zevkti."},
        {"ru": "Дети с нетерпением ждали, когда откроется ледовый каток, чтобы опробовать свои новые коньки.", "tr": "Çocuklar yeni patenlerini denemek için buz pistinin açılmasını sabırsızlıkla bekliyorlardı."}
    ],
    "1415": [
        {"ru": "Перед важным собеседованием он не мог скрыть своё сильное внутреннее волнение.", "tr": "Önemli bir iş görüşmesinden önce güçlü içsel heyecanını gizleyemedi."},
        {"ru": "Её голос дрожал от волнения, когда она произносила речь перед огромной аудиторией.", "tr": "Devasa bir seyirci kitlesinin önünde konuşma yaparken sesi heyecandan titriyordu."},
        {"ru": "Радостное волнение охватило всех зрителей, когда на сцену вышел известный музыкант.", "tr": "Sahneye ünlü bir müzisyen çıktığında tüm seyircileri neşeli bir heyecan sardı."}
    ],
    "1417": [
        {"ru": "Наше летнее путешествие по странам Европы оставило массу незабываемых впечатлений.", "tr": "Avrupa ülkelerindeki yaz yolculuğumuz pek çok unutulmaz izlenim bıraktı."},
        {"ru": "Мы планируем отправиться в долгое путешествие на автомобиле вдоль морского побережья.", "tr": "Deniz kıyısı boyunca arabayla uzun bir yolculuğa çıkmayı planlıyoruz."},
        {"ru": "Каждое новое путешествие помогает нам лучше узнать культуру и традиции других народов.", "tr": "Her yeni yolculuk, diğer halkların kültürlerini ve geleneklerini daha iyi anlamamıza yardımcı olur."}
    ],
    "1419": [
        {"ru": "Это промышленное предприятие производит детали для современных автомобилей и экспортирует их за рубеж.", "tr": "Bu sanayi işletmesi modern arabalar için parçalar üretir ve bunları yurtdışına ihraç eder."},
        {"ru": "Руководство решило модернизировать старое предприятие, чтобы увеличить объёмы производства.", "tr": "Yönetim, üretim hacmini artırmak için eski fabrikayı modernize etmeye karar verdi."},
        {"ru": "Местное предприятие обеспечило рабочими местами более пятисот жителей нашего небольшого города.", "tr": "Yerel fabrika, küçük kasabamızın beş yüzden fazla sakinine istihdam sağladı."}
    ],
    "1421": [
        {"ru": "Моя единственная просьба к тебе — позвони мне, когда благополучно доберёшься до дома.", "tr": "Senden tek isteğim, eve sağ salim vardığında beni araman."},
        {"ru": "Он обратился к начальнику с письменной просьбой о предоставлении небольшого отпуска за свой счёт.", "tr": "Müdüre kendi hesabına kısa bir izin verilmesi için yazılı bir ricala başvurdu."},
        {"ru": "К сожалению, её просьба о помощи была проигнорирована большинством прохожих на улице.", "tr": "Ne yazık ki, yardım isteği sokaktaki çoğu yoldan geçen tarafından görmezden gelindi."}
    ],
    "1423": [
        {"ru": "Клиент оставил письменную жалобу на плохое обслуживание в книге отзывов ресторана.", "tr": "Müşteri, restoranın şikayet defterine kötü hizmetle ilgili yazılı bir şikayet bıraktı."},
        {"ru": "Её официальная жалоба была рассмотрена руководством компании в течение нескольких рабочих дней.", "tr": "Resmi şikayeti şirket yönetimi tarafından birkaç iş günü içinde incelendi."},
        {"ru": "Соседи подали в полицию коллективную жалобу на громкую музыку по ночам.", "tr": "Komşular, geceleri yüksek sesli müzik nedeniyle polise toplu bir şikayette bulundular."}
    ],
    "1425": [
        {"ru": "Перед началом строительных работ все рабочие обязательно проходят строгий инструктаж по технике безопасности.", "tr": "İnşaat çalışmalarına başlamadan önce tüm işçiler mutlaka katı bir güvenlik brifinginden geçerler."},
        {"ru": "Тренер провёл подробный инструктаж для новичков перед их первым погружением с аквалангом.", "tr": "Antrenör, yeni başlayanlar için ilk tüplü dalışlarından önce detaylı bir bilgilendirme yaptı."},
        {"ru": "Утренний инструктаж занял всего десять минут, после чего сотрудники приступили к своим обязанностям.", "tr": "Sabah toplantısı sadece on dakika sürdü, ardından çalışanlar görevlerine başladılar."}
    ],
    "1427": [
        {"ru": "Его смелый поступок во время пожара спас жизнь нескольким маленьким детям.", "tr": "Yangın sırasındaki cesur davranışı birkaç küçük çocuğun hayatını kurtardı."},
        {"ru": "Никто не ожидал от неё такого благородного поступка, ведь она обычно была очень замкнутой.", "tr": "Kimse ondan böyle asil bir davranış beklemiyordu, çünkü o genellikle çok içine kapanıktı."},
        {"ru": "Каждый наш поступок имеет свои последствия, о которых стоит задумываться заранее.", "tr": "Her eylemimizin önceden düşünmeye değer kendi sonuçları vardır."}
    ],
    "1429": [
        {"ru": "Его вчерашняя выходка была очевидной дуростью, за которую ему теперь стыдно.", "tr": "Dünkü maskaralığı şimdi utandığı bariz bir aptallıktı."},
        {"ru": "Подростки часто совершают разные ошибки просто по дурости и неопытности.", "tr": "Ergenler çoğu zaman sadece aptallık ve tecrübesizlikten çeşitli hatalar yaparlar."},
        {"ru": "Это не злой умысел, а просто случайная дурость, которую можно легко простить.", "tr": "Bu kötü niyet değil, sadece kolayca affedilebilecek rastgele bir aptallıktır."}
    ],
    "1431": [
        {"ru": "Большая удача сопутствовала нашей команде на протяжении всего этого сложного проекта.", "tr": "Tüm bu zorlu proje boyunca büyük bir şans takımımıza eşlik etti."},
        {"ru": "Найти ключи от машины в таком глубоком снегу — это действительно невероятная удача.", "tr": "Arabaların anahtarlarını bu kadar derin karda bulmak gerçekten inanılmaz bir şans."},
        {"ru": "Он верил, что удача улыбнётся ему, и продолжал упорно тренироваться каждый день.", "tr": "Başarının ona güleceğine inanıyor ve her gün ısrarla antrenman yapmaya devam ediyordu."}
    ],
    "1433": [
        {"ru": "Прямая телевизионная передача финала чемпионата мира собрала миллионы зрителей перед экранами.", "tr": "Dünya Kupası finalinin canlı televizyon yayını milyonlarca izleyiciyi ekran başına topladı."},
        {"ru": "В воскресенье вечером по радио шла интересная передача о классической европейской литературе.", "tr": "Pazar akşamı radyoda klasik Avrupa edebiyatı hakkında ilginç bir yayın vardı."},
        {"ru": "Точная передача информации между отделами критически важна для успешной работы всей компании.", "tr": "Departmanlar arasında doğru bilgi aktarımı, tüm şirketin başarılı çalışması için kritik öneme sahiptir."}
    ],
    "1435": [
        {"ru": "Неожиданный денежный выигрыш в лотерею позволил семье купить новую квартиру в центре города.", "tr": "Piyangodan beklenmedik para kazancı, ailenin şehir merkezinde yeni bir daire satın almasına olanak tanıdı."},
        {"ru": "Его главный выигрыш в жизни — это верные друзья, которые всегда готовы помочь.", "tr": "Hayattaki en büyük kazancı, her zaman yardım etmeye hazır olan sadık dostlarıdır."},
        {"ru": "Команда отпраздновала свой заслуженный выигрыш в турнире громкой вечеринкой.", "tr": "Takım, turnuvadaki hak edilmiş galibiyetini gürültülü bir partiyle kutladı."}
    ],
    "1437": [
        {"ru": "Древние греки верили, что каждое природное явление контролирует определённое божество.", "tr": "Eski Yunanlılar, her doğa olayının belirli bir tanrı tarafından kontrol edildiğine inanıyorlardı."},
        {"ru": "В центре древнего храма возвышалась огромная статуя, изображавшая местное божество.", "tr": "Eski tapınağın merkezinde yerel tanrıyı tasvir eden devasa bir heykel yükseliyordu."},
        {"ru": "Жители деревни приносили дары на алтарь, чтобы умилостивить морское божество перед рыбалкой.", "tr": "Köylüler, balığa çıkmadan önce deniz tanrısını yatıştırmak için sunağa hediyeler getiriyorlardı."}
    ],
    "1439": [
        {"ru": "Для роста мышц спортсменам необходимо употреблять пищу, содержащую качественный животный белок.", "tr": "Kas gelişimi için sporcuların kaliteli hayvansal protein içeren yiyecekler tüketmeleri gerekir."},
        {"ru": "Яичный белок часто используется в кулинарии для приготовления легких и воздушных десертов.", "tr": "Yumurta akı (proteini) aşçılıkta hafif ve havadar tatlılar hazırlamak için sıklıkla kullanılır."},
        {"ru": "Врачи рекомендуют включить в свой ежедневный рацион растительный белок, например, чечевицу или фасоль.", "tr": "Doktorlar, mercimek veya fasulye gibi bitkisel proteini günlük diyetinize dahil etmenizi önerir."}
    ],
    "1441": [
        {"ru": "В старой сказке добрый великан помогал людям строить мосты через глубокие реки.", "tr": "Eski masalda iyi kalpli dev, insanların derin nehirler üzerine köprüler kurmasına yardım ederdi."},
        {"ru": "По сравнению с обычными домами этот новый небоскреб выглядел как настоящий великан.", "tr": "Sıradan evlere kıyasla bu yeni gökdelen gerçek bir dev gibi görünüyordu."},
        {"ru": "В лесу стоял дуб-великан, который, по словам местных жителей, рос здесь более трехсот лет.", "tr": "Ormanda, yerel halka göre üç yüz yılı aşkın süredir burada yetişen dev bir meşe ağacı duruyordu."}
    ],
    "1442": [
        {"ru": "С раннего детства было понятно, что он левша, так как он брал ложку левой рукой.", "tr": "Kaşığı sol eliyle aldığı için solak olduğu erken çocukluktan beri belliydi."},
        {"ru": "Знаменитый художник был левшой, и это придавало его картинам особенный, уникальный стиль.", "tr": "Ünlü ressam solaktı ve bu onun tablolarına özel, eşsiz bir tarz kazandırdı."},
        {"ru": "В теннисном матче играть против левши бывает довольно сложно из-за нестандартных ударов.", "tr": "Bir tenis maçında solak birine karşı oynamak alışılmadık vuruşlardan dolayı oldukça zor olabilir."}
    ]
}

with open('/Users/kagansmtdms/Downloads/Проекты/Ru-Tr-main/scripts/result_1.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
