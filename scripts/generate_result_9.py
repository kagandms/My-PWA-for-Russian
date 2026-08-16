import json

data = {
    "1442": [
        {"ru": "Не стоит обращать внимание на это нелепое сойлеме.", "tr": "Bu saçma söyleme dikkat etmeye değmez."},
        {"ru": "Такое сойлеме может обидеть даже самого терпеливого человека.", "tr": "Böyle bir söylem en sabırlı insanı bile incitebilir."},
        {"ru": "В его словах было странное сойлеме, которое никто не понял.", "tr": "Sözlerinde kimsenin anlamadığı tuhaf bir söylem vardı."}
    ],
    "1661": [
        {"ru": "Журналист задал очень провокационный вопрос на пресс-конференции.", "tr": "Gazeteci basın toplantısında çok kışkırtıcı bir soru sordu."},
        {"ru": "Этот вопрос требует детального изучения и серьезного подхода.", "tr": "Bu konu/soru detaylı inceleme ve ciddi bir yaklaşım gerektiriyor."},
        {"ru": "Мы обсуждали этот важный вопрос на протяжении нескольких часов.", "tr": "Bu önemli meseleyi birkaç saat boyunca tartıştık."}
    ],
    "1662": [
        {"ru": "Перед нами стоит сложная задача, которую нужно решить до завтра.", "tr": "Önümüzde yarına kadar çözülmesi gereken zor bir görev var."},
        {"ru": "Главная задача нашего отдела – увеличить продажи в этом квартале.", "tr": "Departmanımızın ana görevi bu çeyrekte satışları artırmaktır."},
        {"ru": "Математическая задача оказалась слишком трудной для большинства учеников.", "tr": "Matematik problemi öğrencilerin çoğu için fazla zor geldi."}
    ],
    "1713": [
        {"ru": "В луче света была видна каждая танцующая в воздухе пылинка.", "tr": "Işık huzmesinde havada dans eden her bir toz tanesi görülüyordu."},
        {"ru": "Она убиралась так тщательно, что в комнате не осталось ни одна пылинка.", "tr": "O kadar titiz temizlik yaptı ki odada tek bir toz tanesi kalmadı."},
        {"ru": "Даже крошечная пылинка может вызвать серьезное раздражение глаза.", "tr": "Küçücük bir toz tanesi bile gözde ciddi tahrişe neden olabilir."}
    ],
    "1715": [
        {"ru": "На поверхности наваристого супа плавала золотистая жиринка.", "tr": "Koyu çorbanın yüzeyinde altın rengi bir yağ damlası yüzüyordu."},
        {"ru": "Маленькая жиринка оставила на новой скатерти заметное пятно.", "tr": "Küçük bir yağ lekesi yeni masa örtüsünde belirgin bir iz bıraktı."},
        {"ru": "Каждая жиринка в этом мясе делает его невероятно сочным.", "tr": "Bu etteki her bir yağ parçası onu inanılmaz derecede sulu yapıyor."}
    ],
    "1728": [
        {"ru": "Новый лабораторный микроскоп позволяет рассмотреть структуру клеток.", "tr": "Yeni laboratuvar mikroskobu hücre yapısını incelemeye olanak tanıyor."},
        {"ru": "Учёные провели сложный лабораторный эксперимент с опасными веществами.", "tr": "Bilim insanları tehlikeli maddelerle karmaşık bir laboratuvar deneyi yaptılar."},
        {"ru": "Этот лабораторный анализ поможет установить точную причину заболевания.", "tr": "Bu laboratuvar analizi hastalığın kesin nedenini belirlemeye yardımcı olacak."}
    ],
    "1730": [
        {"ru": "На ужин мама приготовила вкусный картофельный салат с зеленью.", "tr": "Akşam yemeği için annem yeşillikli lezzetli bir patates salatası yaptı."},
        {"ru": "Горячий картофельный суп отлично согревает в холодную зимнюю погоду.", "tr": "Sıcak patates çorbası soğuk kış günlerinde harika ısıtır."},
        {"ru": "Я заказал большой картофельный блин со сметаной и грибами.", "tr": "Ekşi krema ve mantarlı büyük bir patates krebi sipariş ettim."}
    ],
    "1732": [
        {"ru": "Рано утром в деревне раздался громкий колокольный звон.", "tr": "Sabahın erken saatlerinde köyde yüksek sesli bir çan sesi yankılandı."},
        {"ru": "Этот старинный колокольный звон всегда вызывает у меня чувство умиротворения.", "tr": "Bu eski çan sesi bende her zaman bir huzur duygusu uyandırır."},
        {"ru": "Праздничный колокольный звон разносился по всей округе в день Пасхи.", "tr": "Paskalya gününde bayramlık çan sesi tüm çevreye yayılıyordu."}
    ],
    "1734": [
        {"ru": "Свежевыжатый яблочный сок содержит много витаминов и полезных веществ.", "tr": "Taze sıkılmış elma suyu birçok vitamin ve faydalı madde içerir."},
        {"ru": "Бабушка испекла традиционный яблочный пирог по своему секретному рецепту.", "tr": "Büyükanne gizli tarifine göre geleneksel elmalı turta pişirdi."},
        {"ru": "В саду витал сладкий яблочный аромат от спелых плодов.", "tr": "Bahçede olgun meyvelerden gelen tatlı bir elma kokusu dolaşıyordu."}
    ],
    "1736": [
        {"ru": "Старинное парусное судно медленно входило в городскую гавань.", "tr": "Eski yelkenli gemi şehir limanına yavaşça giriyordu."},
        {"ru": "Это парусное судно было построено специально для кругосветного путешествия.", "tr": "Bu yelkenli gemi özellikle dünya turu için inşa edilmişti."},
        {"ru": "Во время шторма маленькое парусное судно сильно раскачивалось на волнах.", "tr": "Fırtına sırasında küçük yelkenli gemi dalgalarda şiddetle sallanıyordu."}
    ],
    "1738": [
        {"ru": "Её новый научный руководитель помог ей с публикацией важной статьи.", "tr": "Yeni bilimsel danışmanı ona önemli bir makalenin yayımlanmasında yardım etti."},
        {"ru": "Этот научный журнал пользуется большим авторитетом среди исследователей.", "tr": "Bu bilimsel dergi araştırmacılar arasında büyük bir saygınlığa sahiptir."},
        {"ru": "Международный научный симпозиум состоится в конце следующего месяца.", "tr": "Uluslararası bilimsel sempozyum önümüzdeki ayın sonunda gerçekleşecek."}
    ],
    "1740": [
        {"ru": "Праздничный ужин прошёл в уютной и дружеской атмосфере.", "tr": "Bayram yemeği rahat ve sıcak bir atmosferde geçti."},
        {"ru": "По всему городу был слышен праздничный салют в честь Дня независимости.", "tr": "Tüm şehirde Bağımsızlık Günü onuruna atılan bayram havai fişekleri duyuluyordu."},
        {"ru": "На ней был красивый праздничный наряд, украшенный блестящими камнями.", "tr": "Üzerinde parlak taşlarla süslenmiş güzel bir bayramlık kıyafet vardı."}
    ],
    "1742": [
        {"ru": "Опытный военный корреспондент отправился в зону боевых действий.", "tr": "Deneyimli askeri muhabir savaş bölgesine gitti."},
        {"ru": "Этот старый военный самолёт теперь выставлен в городском музее.", "tr": "Bu eski askeri uçak şimdi şehir müzesinde sergileniyor."},
        {"ru": "Новый военный бюджет был одобрен правительством на прошлой неделе.", "tr": "Yeni askeri bütçe geçen hafta hükümet tarafından onaylandı."}
    ],
    "1744": [
        {"ru": "Рыжая белка быстро забралась на самую верхушку высокой сосны.", "tr": "Kızıl sincap hızla yüksek çam ağacının en tepesine tırmandı."},
        {"ru": "В парке ручная белка брала орехи прямо из моих рук.", "tr": "Parkta evcil bir sincap fındıkları doğrudan ellerimden aldı."},
        {"ru": "За окном мелькнула белка, собирающая запасы на долгую зиму.", "tr": "Pencerenin dışında uzun kış için erzak toplayan bir sincap belirdi."}
    ],
    "1746": [
        {"ru": "Новорожденный телёнок с трудом пытался встать на свои слабые ноги.", "tr": "Yeni doğan buzağı zayıf bacaklarının üzerinde durmaya çalışıyordu."},
        {"ru": "Фермер заботливо кормил телёнка свежим молоком из бутылочки.", "tr": "Çiftçi buzağıyı biberondan taze sütle özenle besliyordu."},
        {"ru": "Маленький пятнистый телёнок испуганно спрятался за спину своей матери.", "tr": "Küçük benekli buzağı korkuyla annesinin arkasına saklandı."}
    ],
    "1748": [
        {"ru": "Розовый поросёнок радостно валялся в большой грязной луже.", "tr": "Pembe domuzcuk büyük çamurlu su birikintisinde neşeyle yuvarlanıyordu."},
        {"ru": "Этот забавный поросёнок стал любимым питомцем для всех детей на ферме.", "tr": "Bu komik domuzcuk çiftlikteki tüm çocuklar için favori evcil hayvan oldu."},
        {"ru": "На столе стояла красивая копилка, сделанная в виде поросёнка.", "tr": "Masada domuzcuk şeklinde yapılmış güzel bir kumbara duruyordu."}
    ],
    "1750": [
        {"ru": "Прекрасный белый лебедь грациозно скользил по глади чистого озера.", "tr": "Güzel beyaz kuğu temiz gölün yüzeyinde zarifçe süzülüyordu."},
        {"ru": "Чёрный лебедь является редким и очень красивым видом птиц.", "tr": "Siyah kuğu nadir ve çok güzel bir kuş türüdür."},
        {"ru": "В сказке гадкий утёнок превратился в невероятно красивого лебедя.", "tr": "Masalda çirkin ördek yavrusu inanılmaz derecede güzel bir kuğuya dönüştü."}
    ],
    "1752": [
        {"ru": "Старая черепаха медленно, но уверенно ползла к прохладной воде.", "tr": "Yaşlı kaplumbağa yavaş ama emin adımlarla serin suya doğru sürünüyordu."},
        {"ru": "Морская черепаха отложила яйца в тёплый песок на ночном пляже.", "tr": "Deniz kaplumbağası yumurtalarını gece plajındaki sıcak kuma bıraktı."},
        {"ru": "Моя домашняя черепаха любит есть свежие листья салата и одуванчики.", "tr": "Benim evcil kaplumbağam taze marul ve karahindiba yaprakları yemeyi seviyor."}
    ],
    "1755": [
        {"ru": "Белый пушистый кролик быстро спрятался в своей глубокой норе.", "tr": "Beyaz tüylü tavşan hızla derin yuvasına saklandı."},
        {"ru": "Фокусник неожиданно достал из своей черной шляпы живого кролика.", "tr": "Sihirbaz aniden siyah şapkasından canlı bir tavşan çıkardı."},
        {"ru": "Маленький кролик с аппетитом грыз сочную и сладкую морковку.", "tr": "Küçük tavşan iştahla sulu ve tatlı bir havuç kemiriyordu."}
    ],
    "1757": [
        {"ru": "Огромная серая крыса пробежала по тёмному подвалу старого дома.", "tr": "Kocaman gri bir sıçan eski evin karanlık bodrumunda koştu."},
        {"ru": "Лабораторная крыса успешно прошла сложный лабиринт в поисках еды.", "tr": "Laboratuvar sıçanı yiyecek bulmak için karmaşık labirenti başarıyla geçti."},
        {"ru": "Домашняя крыса оказалась очень умным и ласковым питомцем.", "tr": "Evcil sıçan oldukça zeki ve sevecen bir evcil hayvan çıktı."}
    ],
    "1759": [
        {"ru": "Известный ювелир создал уникальное колье для королевской семьи.", "tr": "Ünlü kuyumcu kraliyet ailesi için eşsiz bir kolye tasarladı."},
        {"ru": "Опытный ювелир может отличить настоящий бриллиант от качественной подделки.", "tr": "Deneyimli bir kuyumcu gerçek bir elması kaliteli bir sahtesinden ayırt edebilir."},
        {"ru": "Вчера ювелир закончил работу над моим обручальным кольцом с сапфиром.", "tr": "Dün kuyumcu safirli nişan yüzüğüm üzerindeki çalışmasını tamamladı."}
    ],
    "1761": [
        {"ru": "Местный профсоюз организовал масштабную забастовку работников завода.", "tr": "Yerel sendika fabrika işçilerinin büyük çaplı grevini organize etti."},
        {"ru": "Профсоюз добился значительного повышения заработной платы для всех сотрудников.", "tr": "Sendika tüm çalışanlar için önemli bir maaş artışı elde etti."},
        {"ru": "Каждый работник имеет право вступить в независимый профсоюз для защиты своих прав.", "tr": "Her işçinin haklarını korumak için bağımsız bir sendikaya katılma hakkı vardır."}
    ],
    "1763": [
        {"ru": "Новый спортивный комплекс включает в себя бассейн, тренажерный зал и сауну.", "tr": "Yeni spor kompleksi bir yüzme havuzu, spor salonu ve sauna içermektedir."},
        {"ru": "Этот жилой комплекс расположен в экологически чистом районе города.", "tr": "Bu konut kompleksi şehrin çevre dostu bir bölgesinde yer almaktadır."},
        {"ru": "Гостиничный комплекс предлагает своим гостям высочайший уровень сервиса.", "tr": "Otel kompleksi misafirlerine en yüksek düzeyde hizmet sunmaktadır."}
    ],
    "1858": [
        {"ru": "Многие страны продолжают активно торговать природными ресурсами на мировом рынке.", "tr": "Birçok ülke dünya pazarında doğal kaynaklarla aktif olarak ticaret yapmaya devam ediyor."},
        {"ru": "Они начали торговать антикварной мебелью в центре старого города.", "tr": "Eski şehrin merkezinde antika mobilya ticareti yapmaya başladılar."},
        {"ru": "Компания планирует торговать своими новыми смартфонами по всей Европе.", "tr": "Şirket yeni akıllı telefonlarının ticaretini tüm Avrupa'da yapmayı planlıyor."}
    ]
}

with open('/Users/kagansmtdms/Downloads/Проекты/Ru-Tr-main/scripts/result_9.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
