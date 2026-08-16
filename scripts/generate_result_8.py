import json
import os

data = {
  "1374": [
    {"ru": "Молодая артистка прекрасно исполнила свою роль в новом спектакле.", "tr": "Genç sanatçı yeni oyunda rolünü harika bir şekilde sergiledi."},
    {"ru": "Эта известная артистка часто выступает на сценах европейских театров.", "tr": "Bu ünlü sanatçı sık sık Avrupa tiyatrolarının sahnelerinde sahne alır."},
    {"ru": "Каждая талантливая артистка мечтает получить главную роль в таком фильме.", "tr": "Her yetenekli sanatçı böyle bir filmde başrol oynamayı hayal eder."}
  ],
  "1376": [
    {"ru": "Аспирантка усердно работает над своей диссертацией в научной лаборатории.", "tr": "Doktora öğrencisi bilim laboratuvarında tezinin üzerinde özenle çalışıyor."},
    {"ru": "Вчера аспирантка успешно выступила с докладом на международной конференции.", "tr": "Dün doktora öğrencisi uluslararası bir konferansta başarıyla sunum yaptı."},
    {"ru": "Наша аспирантка планирует защитить свою научную работу в следующем году.", "tr": "Doktora öğrencimiz bilimsel çalışmasını gelecek yıl savunmayı planlıyor."}
  ],
  "1378": [
    {"ru": "Магистрантка первого курса активно участвует в университетских исследовательских проектах.", "tr": "Birinci sınıf yüksek lisans öğrencisi üniversitenin araştırma projelerine aktif olarak katılıyor."},
    {"ru": "Умная магистрантка быстро нашла решение этой сложной математической задачи.", "tr": "Zeki yüksek lisans öğrencisi bu zor matematik probleminin çözümünü hızla buldu."},
    {"ru": "Сегодня магистрантка должна сдать окончательный вариант своей курсовой работы.", "tr": "Bugün yüksek lisans öğrencisi dönem ödevinin son halini teslim etmelidir."}
  ],
  "1380": [
    {"ru": "Виртуозная пианистка поразила публику своим невероятным исполнением классической музыки.", "tr": "Virtüöz piyanist, klasik müziği inanılmaz icrasıyla seyirciyi büyüledi."},
    {"ru": "Пианистка каждый день репетирует по несколько часов перед важным концертом.", "tr": "Piyanist önemli konserden önce her gün birkaç saat prova yapar."},
    {"ru": "Известная пианистка дала бесплатный мастер-класс для студентов музыкального училища.", "tr": "Ünlü piyanist müzik okulu öğrencileri için ücretsiz bir ustalık sınıfı verdi."}
  ],
  "1382": [
    {"ru": "Чтение хороших книг помогает человеку быстро умнеть и развивать мышление.", "tr": "İyi kitaplar okumak, insanın hızla akıllanmasına ve düşüncesini geliştirmesine yardımcı olur."},
    {"ru": "С возрастом мы начинаем умнеть и лучше понимать окружающий нас мир.", "tr": "Yaşlandıkça akıllanmaya ve etrafımızdaki dünyayı daha iyi anlamaya başlarız."},
    {"ru": "Если ты будешь больше учиться, то обязательно начнешь умнеть на глазах.", "tr": "Daha fazla çalışırsan, kesinlikle gözle görülür şekilde akıllanmaya başlayacaksın."}
  ],
  "1384": [
    {"ru": "Профессиональный танцор грациозно двигался по сцене под ритмичную музыку.", "tr": "Profesyonel dansçı ritmik müzik eşliğinde sahnede zarifçe hareket etti."},
    {"ru": "Этот танцор выиграл первое место на международном конкурсе бальных танцев.", "tr": "Bu dansçı uluslararası salon dansları yarışmasında birinci oldu."},
    {"ru": "Каждый хороший танцор должен обладать выносливостью и чувством ритма.", "tr": "Her iyi dansçı dayanıklılığa ve ritim duygusuna sahip olmalıdır."}
  ],
  "1386": [
    {"ru": "Курьер должен разносить почту и посылки по всем районам города.", "tr": "Kurye, posta ve paketleri şehrin tüm bölgelerine dağıtmalıdır."},
    {"ru": "Официантка начала быстро разносить напитки гостям на праздничном банкете.", "tr": "Garson, kutlama ziyafetinde misafirlere hızla içecek dağıtmaya başladı."},
    {"ru": "Сотрудники почты стараются вовремя разносить важные письма по адресам.", "tr": "Posta çalışanları önemli mektupları zamanında adreslere ulaştırmaya çalışıyorlar."}
  ],
  "1388": [
    {"ru": "Проситель долго ждал в коридоре, чтобы поговорить с директором компании.", "tr": "Ricacı, şirket müdürüyle konuşmak için koridorda uzun süre bekledi."},
    {"ru": "Каждый проситель должен заполнить эту официальную форму перед подачей заявления.", "tr": "Her ricacı, başvuruyu yapmadan önce bu resmi formu doldurmalıdır."},
    {"ru": "Вежливый проситель объяснил свою сложную ситуацию работнику социальной службы.", "tr": "Kibar ricacı zor durumunu sosyal hizmet görevlisine anlattı."}
  ],
  "1390": [
    {"ru": "Ночной сторож внимательно следит за порядком на территории огромного склада.", "tr": "Gece bekçisi devasa deponun arazisindeki düzeni dikkatle takip ediyor."},
    {"ru": "Строгий охранник попросил посетителей предъявить документы при входе в здание.", "tr": "Sert bekçi (güvenlik) binaya girişte ziyaretçilerden kimliklerini göstermelerini istedi."},
    {"ru": "Этот пожилой сторож работает в нашей школе уже больше десяти лет.", "tr": "Bu yaşlı bekçi okulumuzda on yıldan fazla bir süredir çalışıyor."}
  ],
  "1392": [
    {"ru": "Великий философ и мыслитель оставил после себя множество ценных трудов.", "tr": "Büyük filozof ve düşünür arkasında birçok değerli eser bıraktı."},
    {"ru": "Известный мыслитель прошлого века предсказал многие современные социальные проблемы.", "tr": "Geçen yüzyılın ünlü düşünürü günümüzün birçok sosyal problemini öngördü."},
    {"ru": "Каждый глубокий мыслитель ищет ответы на вечные вопросы человеческого существования.", "tr": "Her derin düşünür insan varoluşunun ezeli sorularına cevaplar arar."}
  ],
  "1394": [
    {"ru": "Внимательный слушатель всегда может уловить скрытый смысл в словах оратора.", "tr": "Dikkatli bir dinleyici, konuşmacının sözlerindeki gizli anlamı her zaman yakalayabilir."},
    {"ru": "Каждый слушатель этой радиостанции может позвонить в прямой эфир студии.", "tr": "Bu radyo istasyonunun her dinleyicisi stüdyonun canlı yayınına telefonla bağlanabilir."},
    {"ru": "Интересная лекция увлекла всех, и ни один слушатель не остался равнодушным.", "tr": "İlginç ders herkesi büyüledi ve hiçbir dinleyici kayıtsız kalmadı."}
  ],
  "1396": [
    {"ru": "Этот смелый спасатель стал настоящим героем для жителей затопленного города.", "tr": "Bu cesur kurtarıcı, sular altında kalan şehrin sakinleri için gerçek bir kahraman oldu."},
    {"ru": "Врачи в больнице работали круглосуточно, как настоящие спасители человеческих жизней.", "tr": "Hastanede doktorlar insan hayatının gerçek kurtarıcıları olarak gece gündüz çalıştılar."},
    {"ru": "Мой друг всегда приходит на помощь и действует как мой спаситель.", "tr": "Arkadaşım her zaman yardıma gelir ve benim kurtarıcım gibi davranır."}
  ],
  "1398": [
    {"ru": "Механик быстро починил мощный двигатель этого старого спортивного автомобиля.", "tr": "Tamirci bu eski spor arabanın güçlü motorunu hızla tamir etti."},
    {"ru": "Современный электрический мотор работает совершенно бесшумно и не загрязняет экологию.", "tr": "Modern elektrik motoru tamamen sessiz çalışır ve çevreyi kirletmez."},
    {"ru": "Когда мы завели мотор лодки, она плавно отплыла от деревянного пирса.", "tr": "Teknenin motorunu çalıştırdığımızda, ahşap iskeleden yavaşça uzaklaştı."}
  ],
  "1400": [
    {"ru": "Известный шутник в нашем классе снова придумал очень забавную историю.", "tr": "Sınıfımızdaki ünlü şakacı yine çok komik bir hikaye uydurdu."},
    {"ru": "Этот веселый шутник всегда поднимает настроение всем коллегам в офисе.", "tr": "Bu neşeli şakacı ofisteki tüm meslektaşların moralini her zaman yükseltir."},
    {"ru": "Никто не поверил его словам, потому что он всем известный шутник.", "tr": "Kimse onun sözlerine inanmadı, çünkü o herkesçe bilinen bir şakacıdır."}
  ],
  "1402": [
    {"ru": "Эта увлекательная книга рассказывает о приключениях молодых путешественников в дикой природе.", "tr": "Bu sürükleyici kitap, genç gezginlerin vahşi doğadaki maceralarını anlatıyor."},
    {"ru": "Новая историческая книга известного автора быстро стала настоящим бестселлером года.", "tr": "Ünlü yazarın yeni tarihi kitabı hızla yılın gerçek bir en çok satanı oldu."},
    {"ru": "В библиотеке я нашел редкую книгу с красивыми старинными иллюстрациями.", "tr": "Kütüphanede güzel eski resimlemeleri olan nadir bir kitap buldum."}
  ],
  "1404": [
    {"ru": "Неутомимый путешественник решил обойти весь мир с одним лишь рюкзаком.", "tr": "Yorulmak bilmeyen gezgin, sadece bir sırt çantasıyla tüm dünyayı dolaşmaya karar verdi."},
    {"ru": "Этот опытный путешественник уже побывал на всех континентах нашей удивительной планеты.", "tr": "Bu deneyimli gezgin şimdiden inanılmaz gezegenimizin tüm kıtalarında bulundu."},
    {"ru": "Каждый настоящий путешественник знает, как важно уважать культуру чужой страны.", "tr": "Her gerçek gezgin yabancı bir ülkenin kültürüne saygı duymanın ne kadar önemli olduğunu bilir."}
  ],
  "1406": [
    {"ru": "Я совершенно не хотел обидеть тебя своими резкими словами вчера вечером.", "tr": "Dün akşamki sert sözlerimle seni kesinlikle kırmak (incitmek) istememiştim."},
    {"ru": "Очень легко обидеть близкого человека, если не следить за своим поведением.", "tr": "Davranışlarınıza dikkat etmezseniz yakın bir insanı kırmak (incitmek) çok kolaydır."},
    {"ru": "Он старался говорить мягко, чтобы случайно не обидеть свою маленькую сестру.", "tr": "Küçük kız kardeşini kazara incitmemek (kırmamak) için yumuşak konuşmaya çalıştı."}
  ],
  "1408": [
    {"ru": "Хитрый мошенник пытался обмануть доверчивых пенсионеров по телефону вчера утром.", "tr": "Kurnaz dolandırıcı dün sabah telefonda saf emeklileri kandırmaya çalıştı."},
    {"ru": "Полиция наконец арестовала мошенника, который долго скрывался от правосудия.", "tr": "Polis sonunda adaletten uzun süre saklanan dolandırıcıyı tutukladı."},
    {"ru": "Опытный мошенник создал фальшивый сайт для кражи личных данных пользователей.", "tr": "Deneyimli dolandırıcı kullanıcıların kişisel verilerini çalmak için sahte bir site oluşturdu."}
  ],
  "1410": [
    {"ru": "Новый уборщик тщательно вымыл полы и протер пыль в нашем кабинете.", "tr": "Yeni temizlikçi ofisimizde yerleri özenle yıkadı ve tozları sildi."},
    {"ru": "Эта ответственная уборщица всегда поддерживает идеальную чистоту в коридорах больницы.", "tr": "Bu sorumlu temizlikçi, hastane koridorlarında her zaman kusursuz temizliği sağlar."},
    {"ru": "Мы наняли опытного уборщика, чтобы привести дом в порядок после ремонта.", "tr": "Tadilattan sonra evi toparlaması için deneyimli bir temizlikçi tuttuk."}
  ],
  "1411": [
    {"ru": "В популярном ресторане срочно требуется трудолюбивый посудомойщик на вечернюю смену.", "tr": "Popüler restoranda akşam vardiyası için acilen çalışkan bir bulaşıkçı aranıyor."},
    {"ru": "Посудомойщик быстро справлялся с огромными горами грязных тарелок на кухне.", "tr": "Bulaşıkçı mutfaktaki devasa kirli tabak dağlarıyla hızla başa çıkıyordu."},
    {"ru": "Этот молодой посудомойщик мечтает стать шеф-поваром и открыть свое кафе.", "tr": "Bu genç bulaşıkçı baş aşçı olmayı ve kendi kafesini açmayı hayal ediyor."}
  ],
  "1413": [
    {"ru": "Опытный пилот успешно посадил самолет в условиях сильного густого тумана.", "tr": "Deneyimli pilot, şiddetli yoğun sis koşullarında uçağı başarıyla indirdi."},
    {"ru": "Каждый военный пилот проходит долгую и сложную подготовку перед полетами.", "tr": "Her askeri pilot uçuşlardan önce uzun ve zorlu bir eğitimden geçer."},
    {"ru": "Мой брат работает пилотом на международных рейсах уже пять лет.", "tr": "Erkek kardeşim beş yıldır uluslararası uçuşlarda pilot olarak çalışıyor."}
  ],
  "1415": [
    {"ru": "Крепкий носильщик помог нам донести тяжелые чемоданы прямо до номера.", "tr": "Güçlü taşıyıcı, ağır bavulları doğrudan odaya kadar taşımamıza yardım etti."},
    {"ru": "На железнодорожном вокзале носильщик предложил пассажирам свои услуги за небольшую плату.", "tr": "Tren istasyonunda taşıyıcı yolculara küçük bir ücret karşılığında hizmetlerini teklif etti."},
    {"ru": "Опытный перевозчик доставил хрупкий груз в другой город без повреждений.", "tr": "Deneyimli taşıyıcı kırılgan yükü hasarsız bir şekilde başka bir şehre ulaştırdı."}
  ],
  "1417": [
    {"ru": "Каждый честный налогоплательщик вносит свой вклад в развитие инфраструктуры страны.", "tr": "Her dürüst mükellef ülkenin altyapısının gelişimine kendi katkısını sağlar."},
    {"ru": "Государство обязано защищать права каждого гражданина и добросовестного налогоплательщика.", "tr": "Devlet, her vatandaşın ve iyi niyetli mükellefin haklarını korumakla yükümlüdür."},
    {"ru": "Ответственный налогоплательщик всегда вовремя сдает все необходимые финансовые документы.", "tr": "Sorumlu bir mükellef gerekli tüm mali belgeleri her zaman zamanında teslim eder."}
  ],
  "1419": [
    {"ru": "Мы положили свежее мясо в морозильник, чтобы оно не испортилось быстро.", "tr": "Çabuk bozulmasın diye taze eti buzluğa koyduk."},
    {"ru": "Современный морозильник способен долго сохранять витамины в замороженных овощах и ягодах.", "tr": "Modern buzluk, dondurulmuş sebze ve meyvelerdeki vitaminleri uzun süre koruyabilir."},
    {"ru": "В ресторане сломался большой морозильник, и поварам пришлось срочно спасать продукты.", "tr": "Restorandaki büyük buzluk bozuldu ve aşçıların acilen yiyecekleri kurtarması gerekti."}
  ],
  "1421": [
    {"ru": "Я тщательно вымыл руки и умыл лицо над чистой белой раковиной.", "tr": "Ellerimi iyice yıkadım ve temiz beyaz lavabonun üzerinde yüzümü yıkadım."},
    {"ru": "На кухне протекает старая раковина, поэтому нам нужно срочно вызвать сантехника.", "tr": "Mutfaktaki eski lavabo akıtıyor, bu yüzden acilen tesisatçı çağırmamız gerek."},
    {"ru": "Мастер установил новую керамическую раковину в нашей обновленной ванной комнате.", "tr": "Usta, yenilenmiş banyomuza yeni bir seramik lavabo monte etti."}
  ],
  "1423": [
    {"ru": "Надежный поставщик всегда доставляет качественные строительные материалы точно в срок.", "tr": "Güvenilir tedarikçi, kaliteli inşaat malzemelerini her zaman tam zamanında teslim eder."},
    {"ru": "Наш главный поставщик свежих продуктов внезапно повысил цены на овощи.", "tr": "Taze gıda ana tedarikçimiz aniden sebze fiyatlarını artırdı."},
    {"ru": "Компания ищет нового поставщика оборудования для модернизации старого заводского цеха.", "tr": "Şirket, eski fabrika atölyesini modernize etmek için yeni bir ekipman tedarikçisi arıyor."}
  ],
  "1425": [
    {"ru": "Туристы арендовали удобный шезлонг, чтобы позагорать на солнечном морском пляже.", "tr": "Turistler güneşli deniz plajında güneşlenmek için rahat bir şezlong kiraladılar."},
    {"ru": "Возле бассейна стоял свободный шезлонг, на котором лежал белый пушистый кот.", "tr": "Havuzun kenarında üzerinde beyaz tüylü bir kedinin yattığı boş bir şezlong vardı."},
    {"ru": "Вечером сотрудники отеля убирают каждый шезлонг с песчаного берега моря.", "tr": "Akşamları otel çalışanları kumsaldaki her şezlongu kaldırıyor."}
  ],
  "1427": [
    {"ru": "Профессиональный бегун долго тренировался перед участием в международном городском марафоне.", "tr": "Profesyonel koşucu uluslararası şehir maratonuna katılmadan önce uzun süre antrenman yaptı."},
    {"ru": "Молодой бегун уверенно обогнал всех соперников на последнем круге дистанции.", "tr": "Genç koşucu, mesafenin son turunda tüm rakiplerini emin bir şekilde geçti."},
    {"ru": "Каждый выносливый бегун знает, как важно правильно распределять силы во время забега.", "tr": "Her dayanıklı koşucu, yarış sırasında enerjiyi doğru dağıtmanın ne kadar önemli olduğunu bilir."}
  ],
  "1429": [
    {"ru": "Главный выступающий подготовил очень информативную и интересную презентацию для всех зрителей.", "tr": "Baş konuşmacı tüm izleyiciler için çok bilgilendirici ve ilginç bir sunum hazırladı."},
    {"ru": "Талантливый оратор смог убедить аудиторию в необходимости срочных климатических изменений.", "tr": "Yetenekli konuşmacı izleyicileri acil iklim değişikliklerinin gerekliliğine ikna edebildi."},
    {"ru": "Следующий выступающий расскажет о новых тенденциях в современной мировой экономике.", "tr": "Sıradaki konuşmacı günümüz dünya ekonomisindeki yeni eğilimler hakkında konuşacak."}
  ],
  "1431": [
    {"ru": "Этот загадочный молчун предпочитал слушать других, нежели рассказывать о себе.", "tr": "Bu gizemli sessiz adam kendinden bahsetmektense başkalarını dinlemeyi tercih ederdi."},
    {"ru": "Никто в офисе не знал, о чем думает этот странный молчун.", "tr": "Ofisteki hiç kimse bu garip sessiz adamın ne düşündüğünü bilmiyordu."},
    {"ru": "Даже известный молчун не смог сдержать эмоций после просмотра этого трогательного фильма.", "tr": "Tanınmış sessiz adam bile bu dokunaklı filmi izledikten sonra duygularına hakim olamadı."}
  ],
  "1433": [
    {"ru": "Опытный эксперт дал ценные советы по улучшению системы безопасности нашей компании.", "tr": "Deneyimli uzman, şirketimizin güvenlik sistemini iyileştirmek için değerli tavsiyeler verdi."},
    {"ru": "Медицинский специалист внимательно изучил результаты анализов и назначил правильное лечение.", "tr": "Tıbbi uzman test sonuçlarını dikkatlice inceledi ve doğru tedaviyi reçete etti."},
    {"ru": "Каждый приглашенный эксперт высказал свое объективное мнение по этому сложному вопросу.", "tr": "Davet edilen her uzman bu karmaşık konu hakkında tarafsız görüşünü dile getirdi."}
  ],
  "1435": [
    {"ru": "Меткий стрелок поразил все мишени на соревнованиях без единого промаха.", "tr": "Keskin atıcı, yarışmalardaki tüm hedefleri tek bir ıskalama yapmadan vurdu."},
    {"ru": "Олимпийский метатель копья показал невероятный результат на последних международных играх.", "tr": "Olimpik cirit atıcı, son uluslararası oyunlarda inanılmaz bir sonuç gösterdi."},
    {"ru": "Спортивный стрелок долго готовился к этому важному чемпионату страны.", "tr": "Spor atıcısı bu önemli ulusal şampiyonaya uzun süre hazırlandı."}
  ],
  "1437": [
    {"ru": "Ежемесячный заработок этого успешного предпринимателя значительно вырос за последний год.", "tr": "Bu başarılı girişimcinin aylık kazancı son bir yılda önemli ölçüde arttı."},
    {"ru": "Чистая прибыль компании позволила открыть несколько новых филиалов в других городах.", "tr": "Şirketin net kazancı, başka şehirlerde birkaç yeni şube açmayı sağladı."},
    {"ru": "Тяжелый физический труд не всегда приносит хороший и стабильный заработок.", "tr": "Ağır fiziksel emek her zaman iyi ve istikrarlı bir kazanç getirmez."}
  ],
  "1439": [
    {"ru": "Зимой в центральном парке открыли большой и красивый ледовый каток.", "tr": "Kışın merkez parkta büyük ve güzel bir buz pisti açtılar."},
    {"ru": "Каждые выходные дети с радостью бегут на каток играть в хоккей.", "tr": "Her hafta sonu çocuklar hokey oynamak için sevinçle buz pistine koşarlar."},
    {"ru": "Вечером каток ярко освещается разноцветными огнями, создавая праздничную атмосферу.", "tr": "Akşamları buz pisti renkli ışıklarla aydınlatılarak şenlikli bir atmosfer yaratır."}
  ],
  "1441": [
    {"ru": "Эта красивая и мелодичная песня сразу стала популярным летним хитом.", "tr": "Bu güzel ve melodik şarkı kısa sürede popüler bir yaz hiti oldu."},
    {"ru": "Певец исполнил новую песню, которая тронула сердца всех присутствующих зрителей.", "tr": "Şarkıcı, katılan tüm seyircilerin kalbine dokunan yeni bir şarkı seslendirdi."},
    {"ru": "Мы сидели у костра, играли на гитаре и пели любимые песни.", "tr": "Kamp ateşinin etrafında oturduk, gitar çaldık ve en sevdiğimiz şarkıları söyledik."}
  ]
}

os.makedirs('/Users/kagansmtdms/Downloads/Проекты/Ru-Tr-main/scripts/', exist_ok=True)
with open('/Users/kagansmtdms/Downloads/Проекты/Ru-Tr-main/scripts/result_8.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
