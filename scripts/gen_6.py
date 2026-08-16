import json

data = {
    "1185": [
        {"ru": "Сокращение штата сотрудников вызвало много вопросов у коллектива компании.", "tr": "Çalışan kadrosunun kısaltılması, şirket ekibinde birçok soruya yol açtı."},
        {"ru": "Мы обсудили возможное сокращение расходов на рекламу в следующем квартале.", "tr": "Gelecek çeyrekte reklam harcamalarında olası bir kısaltmayı (kesintiyi) tartıştık."},
        {"ru": "Это сокращение часто используется в официальных документах и юридических текстах.", "tr": "Bu kısaltma genellikle resmi belgelerde ve hukuki metinlerde kullanılır."}
    ],
    "1187": [
        {"ru": "Местное наречие оказалось настолько сложным, что мы с трудом понимали жителей.", "tr": "Yerel lehçe o kadar zordu ki, sakinleri anlamakta güçlük çektik."},
        {"ru": "В этом регионе сохранилось древнее наречие, которое изучают многие лингвисты.", "tr": "Bu bölgede, birçok dilbilimcinin incelediği eski bir lehçe korunmuştur."},
        {"ru": "Мой дедушка иногда использует старое деревенское наречие в своей повседневной речи.", "tr": "Büyükbabam bazen günlük konuşmasında eski bir köy lehçesi kullanır."}
    ],
    "1189": [
        {"ru": "Этот научный спор продолжается уже несколько лет без видимых результатов.", "tr": "Bu bilimsel tartışma, görünür bir sonuç olmadan birkaç yıldır devam ediyor."},
        {"ru": "Мы решили не вступать в бессмысленный спор с нашими новыми соседями.", "tr": "Yeni komşularımızla anlamsız bir tartışmaya girmemeye karar verdik."},
        {"ru": "Её аргументы были настолько убедительными, что спор завершился в нашу пользу.", "tr": "Onun argümanları o kadar ikna ediciydi ki, tartışma bizim lehimize sonuçlandı."}
    ],
    "1191": [
        {"ru": "Это был самый разумный выход из сложившейся сложной финансовой ситуации.", "tr": "Bu, ortaya çıkan karmaşık finansal durumdan en mantıklı çıkış yoluydu."},
        {"ru": "Каждый разумный человек понимает важность заботы о собственном здоровье и благополучии.", "tr": "Her mantıklı insan, kendi sağlığına ve refahına dikkat etmenin önemini anlar."},
        {"ru": "Мы пытались найти разумный компромисс, который устроил бы обе стороны конфликта.", "tr": "Çatışmanın her iki tarafını da tatmin edecek mantıklı bir uzlaşma bulmaya çalıştık."}
    ],
    "1192": [
        {"ru": "Он ответил коротко и ясно: «Макул, мы сделаем всё, как договорились».", "tr": "Kısa ve net bir şekilde cevap verdi: «Makul, her şeyi anlaştığımız gibi yapacağız»."},
        {"ru": "Если условия вас устраивают, скажите «макул» и мы подпишем этот договор.", "tr": "Şartlar size uyuyorsa «makul» deyin ve bu sözleşmeyi imzalayalım."},
        {"ru": "Она кивнула головой, прошептала «макул» и быстро вышла из просторного кабинета.", "tr": "Başını salladı, «makul» diye fısıldadı ve geniş ofisten hızla çıktı."}
    ],
    "1194": [
        {"ru": "Нам нужен точный ответ до конца сегодняшнего рабочего дня, пожалуйста, поторопитесь.", "tr": "Bugünkü mesai bitimine kadar kesin bir cevaba ihtiyacımız var, lütfen acele edin."},
        {"ru": "Точный расчет стоимости материалов поможет нам избежать ненужных финансовых потерь.", "tr": "Malzeme maliyetinin kesin hesaplanması, gereksiz finansal kayıplardan kaçınmamıza yardımcı olacaktır."},
        {"ru": "Его точный удар принес команде долгожданную победу в этом трудном матче.", "tr": "Onun kesin (isabetli) vuruşu, takıma bu zorlu maçta uzun zamandır beklenen zaferi getirdi."}
    ],
    "1195": [
        {"ru": "Обязательный медицинский осмотр для всех сотрудников проводится два раза в год.", "tr": "Tüm çalışanlar için zorunlu sağlık kontrolü yılda iki kez yapılmaktadır."},
        {"ru": "Наличие высшего образования — это обязательный критерий для получения данной престижной должности.", "tr": "Yükseköğrenim diplomasına sahip olmak, bu prestijli pozisyonu almak için zorunlu bir kriterdir."},
        {"ru": "Мы включили этот пункт как обязательный в новый коллективный трудовой договор.", "tr": "Bu maddeyi yeni toplu iş sözleşmesine zorunlu olarak ekledik."}
    ],
    "1197": [
        {"ru": "Общественный транспорт в нашем городе работает точно по расписанию и без задержек.", "tr": "Şehrimizdeki kamu (toplu) taşıma tam zamanında ve gecikme olmadan çalışmaktadır."},
        {"ru": "Новый общественный парк стал любимым местом отдыха для многих жителей района.", "tr": "Yeni kamu parkı, birçok mahalle sakini için favori bir dinlenme yeri haline geldi."},
        {"ru": "Его активный вклад в общественный проект был высоко оценен городской администрацией.", "tr": "Kamu projesine yaptığı aktif katkı, şehir yönetimi tarafından yüksek oranda takdir edildi."}
    ],
    "1199": [
        {"ru": "Нам нужно сложить все документы в одну папку и отправить курьером.", "tr": "Tüm belgeleri tek bir dosyada toplamak ve kurye ile göndermek zorundayız."},
        {"ru": "Попробуйте сложить эти числа в уме, не используя калькулятор или смартфон.", "tr": "Hesap makinesi veya akıllı telefon kullanmadan bu sayıları zihninizde toplamayı deneyin."},
        {"ru": "Она аккуратно помогла мне сложить вещи в чемодан перед дальней поездкой.", "tr": "Uzun bir yolculuktan önce eşyaları bavula toplamama nazikçe yardım etti."}
    ],
    "1226": [
        {"ru": "Не стоит утрировать ситуацию, всё не так плохо, как вам кажется.", "tr": "Durumu abartmaya gerek yok, her şey sandığınız kadar kötü değil."},
        {"ru": "Он любит утрировать свои проблемы, чтобы привлечь к себе больше внимания.", "tr": "Daha fazla dikkat çekmek için sorunlarını abartmayı sever."},
        {"ru": "Журналисты часто начинают утрировать факты ради громких заголовков и высоких рейтингов.", "tr": "Gazeteciler, çarpıcı manşetler ve yüksek reytingler uğruna çoğu zaman gerçekleri abartmaya başlarlar."}
    ],
    "1269": [
        {"ru": "У этого старого антикварного стула была сломана одна резная деревянная ножка.", "tr": "Bu eski antika sandalyenin oyma ahşap bir bacağı kırılmıştı."},
        {"ru": "Ножка стола шаталась, поэтому нам пришлось подложить под неё небольшой картон.", "tr": "Masanın bacağı sallanıyordu, bu yüzden altına küçük bir karton koymak zorunda kaldık."},
        {"ru": "Свиная ножка часто используется в традиционных рецептах для приготовления вкусного холодца.", "tr": "Domuz bacağı, lezzetli bir jöle (holodets) hazırlamak için geleneksel tariflerde sıklıkla kullanılır."}
    ],
    "1270": [
        {"ru": "Маленькая ножечка младенца выглядывала из-под теплого шерстяного одеяла в коляске.", "tr": "Bebeğin küçük bacağı bebek arabasındaki sıcak yün battaniyenin altından görünüyordu."},
        {"ru": "Деревянная ножечка игрушечной лошадки случайно отвалилась во время нашей активной игры.", "tr": "Oyuncak atın ahşap bacağı aktif oyunumuz sırasında kazara koptu."},
        {"ru": "Эта тонкая ножечка бокала выглядит слишком хрупкой для ежедневного домашнего использования.", "tr": "Bu bardağın ince bacağı günlük ev kullanımı için çok kırılgan görünüyor."}
    ],
    "1272": [
        {"ru": "Быстрая горная речка протекала прямо за нашим небольшим уютным деревянным домом.", "tr": "Hızlı dağ nehri doğrudan bizim küçük, şirin ahşap evimizin arkasından akıyordu."},
        {"ru": "Летом эта живописная речка мелеет и становится совершенно безопасной для купания детей.", "tr": "Yaz aylarında bu pitoresk nehir sığlaşır ve çocukların yüzmesi için tamamen güvenli hale gelir."},
        {"ru": "Мы решили поставить палатку там, где лесная речка делает крутой поворот.", "tr": "Çadırı orman nehrinin keskin bir dönüş yaptığı yere kurmaya karar verdik."}
    ],
    "1273": [
        {"ru": "Эта крошечная речечка весной превращается в бурный и опасный водный поток.", "tr": "Bu minik nehir bahar aylarında fırtınalı ve tehlikeli bir su akıntısına dönüşür."},
        {"ru": "Тихая речечка медленно несла свои прозрачные воды сквозь густой сосновый лес.", "tr": "Sessiz nehir, berrak sularını yoğun çam ormanının içinden yavaşça taşıyordu."},
        {"ru": "Дети с радостью пускали бумажные кораблики туда, где бежала узкая речечка.", "tr": "Çocuklar, dar nehrin aktığı yerde kağıt gemilerini neşeyle yüzdürdüler."}
    ],
    "1275": [
        {"ru": "Шоколадная конфетка с орехами была моим любимым лакомством в раннем детстве.", "tr": "Fındıklı çikolatalı şeker, erken çocukluğumda en sevdiğim lezzetti."},
        {"ru": "На столе лежала всего одна мятная конфетка в яркой блестящей обёртке.", "tr": "Masada parlak, ışıltılı bir ambalaj içinde sadece bir naneli şeker duruyordu."},
        {"ru": "Он угостил меня, и эта маленькая конфетка сразу подняла мне настроение.", "tr": "Bana ikram etti ve bu küçük şeker anında ruh halimi iyileştirdi."}
    ],
    "1276": [
        {"ru": "Эта карамельная конфеточка оказалась неожиданно вкусной и очень сладкой на вкус.", "tr": "Bu karamelli şeker beklenmedik derecede lezzetli ve çok tatlı çıktı."},
        {"ru": "В кармане его старого пальто завалялась одинокая мятная конфеточка в бумажке.", "tr": "Eski paltosunun cebinde kağıda sarılı yalnız bir naneli şeker kalmıştı."},
        {"ru": "Маленькая конфеточка стала отличным вознаграждением за успешно выполненное домашнее задание.", "tr": "Küçük şeker, başarıyla tamamlanan ev ödevi için harika bir ödül oldu."}
    ],
    "1278": [
        {"ru": "Её новая кожаная сумочка идеально подходила к этому элегантному вечернему платью.", "tr": "Yeni deri çantası bu zarif gece elbisesine mükemmel uyum sağlıyordu."},
        {"ru": "В спешке она забыла, где именно лежит её маленькая черная сумочка.", "tr": "Aceleyle küçük siyah çantasının tam olarak nerede durduğunu unuttu."},
        {"ru": "Эта дорогая дизайнерская сумочка стала прекрасным подарком на её день рождения.", "tr": "Bu pahalı tasarım çanta, doğum günü için harika bir hediye oldu."}
    ],
    "1280": [
        {"ru": "Её загадочная улыбочка давала понять, что она знает больше, чем говорит.", "tr": "Onun gizemli gülümsemesi, söylediğinden daha fazlasını bildiğini açıkça gösteriyordu."},
        {"ru": "Эта милая улыбочка на лице ребенка мгновенно растопила сердце сурового дедушки.", "tr": "Çocuğun yüzündeki bu tatlı gülümseme, sert büyükbabanın kalbini anında eritti."},
        {"ru": "Хитрая улыбочка продавца сразу насторожила нас при осмотре этого подержанного автомобиля.", "tr": "Satıcının kurnaz gülümsemesi, bu kullanılmış arabayı incelerken bizi hemen alarma geçirdi."}
    ],
    "1282": [
        {"ru": "Старая новогодняя открыточка от бабушки бережно хранилась в семейном фотоальбоме долгие годы.", "tr": "Büyükanneden kalan eski yeni yıl kartı, aile fotoğraf albümünde yıllarca özenle saklandı."},
        {"ru": "К букету роз была прикреплена маленькая открыточка с теплыми пожеланиями выздоровления.", "tr": "Gül buketine, geçmiş olsun dileklerini içeren küçük bir kart iliştirilmişti."},
        {"ru": "Эта красочная открыточка с видом Парижа напомнила мне о нашем путешествии.", "tr": "Paris manzaralı bu renkli kart bana seyahatimizi hatırlattı."}
    ],
    "1284": [
        {"ru": "Банковская карточка была случайно заблокирована из-за трехкратного неправильного ввода секретного пин-кода.", "tr": "Banka kartı, gizli pin kodunun üç kez yanlış girilmesi nedeniyle kazara bloke edildi."},
        {"ru": "Медицинская карточка пациента со всей историей болезни потерялась в регистратуре поликлиники.", "tr": "Hastanın tüm tıbbi geçmişini içeren sağlık kartı poliklinik kayıt masasında kayboldu."},
        {"ru": "Скидочная карточка этого супермаркета позволяет экономить до десяти процентов на покупках.", "tr": "Bu süpermarketin indirim kartı, alışverişlerde yüzde ona kadar tasarruf etmenizi sağlar."}
    ],
    "1286": [
        {"ru": "Холодная водочка на праздничном столе отлично сочеталась с традиционными солеными огурцами.", "tr": "Bayram masasındaki soğuk votka, geleneksel tuzlu salatalık turşusu ile mükemmel uyum sağladı."},
        {"ru": "Хорошая водочка в умеренных количествах иногда помогает согреться после долгой зимней прогулки.", "tr": "Kaliteli votka ölçülü miktarda bazen uzun bir kış yürüyüşünden sonra ısınmaya yardımcı olur."},
        {"ru": "Дорогая импортная водочка стала главным украшением скромного ужина в кругу друзей.", "tr": "Pahalı ithal votka, arkadaş ortamındaki mütevazı akşam yemeğinin ana süsü oldu."}
    ],
    "1288": [
        {"ru": "В коридоре внезапно перегорела единственная лампочка, и мы оказались в полной темноте.", "tr": "Koridordaki tek lamba aniden yandı (söndü) ve kendimizi tamamen karanlıkta bulduk."},
        {"ru": "Энергосберегающая лампочка служит гораздо дольше и помогает существенно снизить счета за электричество.", "tr": "Enerji tasarruflu lamba çok daha uzun süre dayanır ve elektrik faturalarını önemli ölçüde azaltmaya yardımcı olur."},
        {"ru": "Тусклая лампочка над подъездом едва освещала покрытые тонким слоем льда ступеньки.", "tr": "Girişin üzerindeki loş lamba, ince bir buz tabakasıyla kaplı basamakları zor aydınlatıyordu."}
    ],
    "1290": [
        {"ru": "Жареная картошечка с грибами и луком всегда была коронным блюдом моей мамы.", "tr": "Mantarlı ve soğanlı kızarmış patates her zaman annemin imza yemeği olmuştur."},
        {"ru": "Молодая картошечка с укропом и сливочным маслом идеально подходит для летнего ужина.", "tr": "Dereotu ve tereyağlı taze patates yaz akşam yemeği için idealdir."},
        {"ru": "Запеченная в духовке картошечка получилась очень румяной, хрустящей и невероятно вкусной.", "tr": "Fırında pişirilmiş patates çok kızarmış, çıtır çıtır ve inanılmaz derecede lezzetli oldu."}
    ],
    "1292": [
        {"ru": "Мягкая перьевая подушечка обеспечила мне глубокий и спокойный сон прошлой ночью.", "tr": "Yumuşak kuş tüyü yastık dün gece bana derin ve huzurlu bir uyku sağladı."},
        {"ru": "Декоративная подушечка на диване идеально сочеталась по цвету с новыми шторами.", "tr": "Kanepedeki dekoratif yastık, renk olarak yeni perdelerle mükemmel bir uyum içindeydi."},
        {"ru": "Для долгой поездки в автобусе эта ортопедическая подушечка оказалась просто незаменимой.", "tr": "Uzun otobüs yolculuğu için bu ortopedik yastık kesinlikle vazgeçilmez oldu."}
    ],
    "1294": [
        {"ru": "Соседская пушистая кошечка часто приходит к нам на крыльцо в поисках лакомства.", "tr": "Komşunun pofuduk kedisi, genellikle ödül maması arayışıyla verandaya gelir."},
        {"ru": "Маленькая рыжая кошечка сладко спала на мягком кресле возле теплого камина.", "tr": "Küçük kızıl kedi, sıcak şöminenin yanındaki yumuşak koltukta tatlı tatlı uyuyordu."},
        {"ru": "Эта породистая кошечка требует особого ухода и регулярного посещения ветеринарной клиники.", "tr": "Bu cins kedi özel bakım ve düzenli veteriner kliniği ziyaretleri gerektirir."}
    ],
    "1296": [
        {"ru": "У него в руках была маленькая записная книжечка, исписанная мелкими непонятными символами.", "tr": "Ellerinde, küçük anlaşılmaz sembollerle yazılmış küçük bir not defteri vardı."},
        {"ru": "Медицинская санитарная книжечка требуется всем работникам сферы общественного питания при трудоустройстве.", "tr": "Sağlık kitabı, işe alım sırasında tüm yemek hizmetleri sektörü çalışanlarından istenmektedir."},
        {"ru": "Трудовая книжечка подтверждает весь ваш многолетний опыт работы по данной специальности.", "tr": "Çalışma kitabı, bu uzmanlık alanındaki yılların iş deneyiminizi doğrulamaktadır."}
    ],
    "1298": [
        {"ru": "Серебряная чайная ложечка звонко ударилась о край тонкого фарфорового блюдца на столе.", "tr": "Gümüş çay kaşığı masadaki ince porselen tabağın kenarına çınlayarak çarptı."},
        {"ru": "Одна мерная ложечка сиропа поможет быстро избавиться от сильного ночного кашля.", "tr": "Bir ölçü kaşığı şurup, şiddetli gece öksürüğünden hızla kurtulmanıza yardımcı olacaktır."},
        {"ru": "Для этого сложного десерта вам понадобится всего одна ложечка ванильного сахара.", "tr": "Bu karmaşık tatlı için sadece bir kaşık vanilya şekerine ihtiyacınız olacak."}
    ],
    "1300": [
        {"ru": "Счастливый трамвайный билетик лежал в его бумажнике на удачу перед важным экзаменом.", "tr": "Önemli bir sınavdan önce şans getirmesi için cüzdanında şanslı bir tramvay bileti duruyordu."},
        {"ru": "Я заранее купил лотерейный билетик, надеясь выиграть крупную сумму денег к праздникам.", "tr": "Tatiller için büyük miktarda para kazanma umuduyla önceden bir piyango bileti aldım."},
        {"ru": "Контролёр попросил предъявить проездной билетик всех пассажиров в задней части автобуса.", "tr": "Kontrolör, otobüsün arka kısmındaki tüm yolculardan seyahat biletlerini göstermelerini istedi."}
    ],
    "1302": [
        {"ru": "Учительница проверила короткий словарный диктантик и поставила всем отличные оценки за старание.", "tr": "Öğretmen kısa kelime diktaatını kontrol etti ve herkese çabaları için mükemmel notlar verdi."},
        {"ru": "Завтра мы будем писать небольшой диктантик по пройденным на прошлой неделе правилам.", "tr": "Yarın geçen hafta işlenen kurallar üzerine küçük bir diktaat yazacağız."},
        {"ru": "Этот диктантик оказался гораздо сложнее, чем я предполагал во время подготовки дома.", "tr": "Bu diktaat, evde hazırlanırken tahmin ettiğimden çok daha zor çıktı."}
    ],
    "1304": [
        {"ru": "Карманный англо-русский словарик всегда выручал меня во время самостоятельных путешествий по Европе.", "tr": "Cep boy İngilizce-Rusça sözlük, Avrupa'daki bağımsız seyahatlerim sırasında beni her zaman kurtardı."},
        {"ru": "Ученик постоянно открывал свой словарик, чтобы найти подходящее слово для перевода текста.", "tr": "Öğrenci, metni çevirmek için uygun kelimeyi bulmak amacıyla sözlüğünü sürekli açıyordu."},
        {"ru": "Этот орфографический словарик поможет вам избежать досадных ошибок в написании сложных терминов.", "tr": "Bu yazım sözlüğü, karmaşık terimlerin yazılışında can sıkıcı hatalardan kaçınmanıza yardımcı olacaktır."}
    ],
    "1306": [
        {"ru": "Вам нужно прочитать этот короткий текстик и ответить на три простых вопроса внизу.", "tr": "Bu kısa metni okumanız ve altındaki üç basit soruyu cevaplamanız gerekiyor."},
        {"ru": "Смешной текстик в поздравительной открытке заставил именинника искренне улыбнуться и поблагодарить друзей.", "tr": "Tebrik kartındaki komik metin, doğum günü çocuğunu içtenlikle gülümsetti ve arkadaşlarına teşekkür etmesini sağladı."},
        {"ru": "Рекламный текстик был написан настолько грамотно, что продажи компании моментально выросли вдвое.", "tr": "Reklam metni o kadar yetkin yazılmıştı ki, şirketin satışları anında ikiye katlandı."}
    ],
    "1308": [
        {"ru": "Простой заточенный карандашик — лучший инструмент для создания быстрых набросков на природе.", "tr": "Sivri uçlu basit bir kalem, doğada hızlı eskizler oluşturmak için en iyi araçtır."},
        {"ru": "Она взяла цветной карандашик и начала старательно раскрашивать рисунок в альбоме.", "tr": "Renkli bir kalem aldı ve albümdeki resmi özenle boyamaya başladı."},
        {"ru": "Маленький карандашик почти полностью исписался, поэтому пришлось искать новый в пенале.", "tr": "Küçük kalem neredeyse tamamen bitti, bu yüzden kalemlikte yenisini aramak zorunda kaldık."}
    ],
    "1310": [
        {"ru": "Бумажный самолётик плавно приземлился прямо на рабочий стол нашего строгого преподавателя.", "tr": "Kağıt uçak, doğrudan katı öğretmenimizin çalışma masasına yumuşak bir şekilde indi."},
        {"ru": "Игрушечный радиоуправляемый самолётик сделал несколько красивых кругов над зеленой лужайкой в парке.", "tr": "Oyuncak uzaktan kumandalı uçak, parktaki yeşil çimlerin üzerinde birkaç güzel tur attı."},
        {"ru": "Мальчик мечтал когда-нибудь управлять настоящим лайнером, а не просто запускать пластиковый самолётик.", "tr": "Çocuk sadece plastik bir uçak uçurmayı değil, bir gün gerçek bir uçağı kullanmayı hayal ediyordu."}
    ],
    "1312": [
        {"ru": "В её правый глазик попала соринка, и он сильно покраснел к вечеру.", "tr": "Sağ gözüne bir çöp kaçtı ve akşama doğru çok kızardı."},
        {"ru": "Котёнок приоткрыл один глазик, посмотрел на меня и снова сладко уснул на диване.", "tr": "Yavru kedi bir gözünü hafifçe açtı, bana baktı ve kanepede tekrar tatlı bir uykuya daldı."},
        {"ru": "Детский врач внимательно осмотрел воспаленный глазик ребенка и выписал специальные лечебные капли.", "tr": "Çocuk doktoru, çocuğun iltihaplı gözünü dikkatle inceledi ve özel tedavi edici damlalar yazdı."}
    ],
    "1314": [
        {"ru": "От холодного зимнего ветра у ребенка сильно покраснел маленький замерзший носик.", "tr": "Soğuk kış rüzgarından çocuğun üşümüş küçük burnu çok kızardı."},
        {"ru": "Плюшевый медвежонок потерял свой черный пластиковый носик после стирки в стиральной машине.", "tr": "Oyuncak pelüş ayı, çamaşır makinesinde yıkandıktan sonra siyah plastik burnunu kaybetti."},
        {"ru": "Собака сунула свой мокрый носик мне в ладонь, выпрашивая очередной кусочек вкусного сыра.", "tr": "Köpek, başka bir parça lezzetli peynir dilenerek ıslak burnunu avucuma soktu."}
    ]
}

with open('/Users/kagansmtdms/Downloads/Проекты/Ru-Tr-main/scripts/result_6.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
