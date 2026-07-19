/**
 * Curated categories for kelimeler_tam.txt.
 * Source line numbers are the authoritative reference for the current catalog.
 */
class WordCategoryManager {
    constructor() {
        this.fallbackCategory = 'Kategorize Edilmemiş';
        this.categoryDefinitions = [
            { name: 'Deyimler, Atasözleri & Kalıplar', icon: '💬' },
            { name: 'Dilbilgisi, Ekler & Söylem Kalıpları', icon: '🧩' },
            { name: 'Zaman, Sayılar & Ölçüler', icon: '🕒' },
            { name: 'Eğitim & Akademik Hayat', icon: '🎓' },
            { name: 'İş, Kariyer & Ekonomi', icon: '💼' },
            { name: 'Ulaşım & Yolculuk', icon: '🚆' },
            { name: 'Konum, Yön & Mekan', icon: '📍' },
            { name: 'Hava, Doğa & Afetler', icon: '🌧️' },
            { name: 'Ev, Eşya & Giyim', icon: '🏠' },
            { name: 'Yemek & Mutfak', icon: '🍽️' },
            { name: 'Sağlık, Beden & Uyku', icon: '🩺' },
            { name: 'İnsan, Aile & İlişkiler', icon: '👥' },
            { name: 'Kişilik & Karakter', icon: '🧠' },
            { name: 'Duygular & Psikoloji', icon: '❤️' },
            { name: 'İletişim, Düşünce & Dil', icon: '🗣️' },
            { name: 'Hukuk, Suç & Güvenlik', icon: '⚖️' },
            { name: 'Toplum, Devlet & Kamu', icon: '🏛️' },
            { name: 'Kültür, Sanat & Medya', icon: '🎭' },
            { name: 'Teknoloji, Araçlar & Nesneler', icon: '📱' },
            { name: 'Hareket & Fiziksel Eylemler', icon: '🏃' },
            { name: 'Günlük Fiiller & Süreçler', icon: '🔄' },
            { name: 'Nitelikler, Durumlar & Sıfatlar', icon: '🎨' },
            { name: 'Eş Anlamlılar', icon: '🔁' },
            { name: 'Zıt Anlamlılar', icon: '↔️' },
            { name: 'Argo & Sokak Dili', icon: '🔥' },
            { name: 'Hayvanlar, Tarım & Doğa', icon: '🌾' },
            { name: 'Matematik & Şekiller', icon: '🔢' },
            { name: 'Din, Mitoloji & İnanç', icon: '✨' },
            { name: 'Soyut Kavramlar & Genel İsimler', icon: '📚' },
            { name: 'Prefiksler', icon: '🧩' },
            { name: this.fallbackCategory, icon: '❔' }
        ];
        this.categoryLineSpecs = this.createCategoryLineSpecs();
        this.categoryBySourceLine = this.buildCategoryBySourceLine();
    }

    createCategoryLineSpecs() {
        return {
            'Deyimler, Atasözleri & Kalıplar': '1,13,46-47,49-50,63-64,67,69,78,90,92,105-106,143-150,170-172,174-175,268,271,286,288,297,299-300,302,306-309,316,321-323,332-335,552,560-561,568,572,607,635,642,646,826',
            'Dilbilgisi, Ekler & Söylem Kalıpları': '25-30,35,37,41,124,130-132,277-278,310,312-313,318,352,355-361,392-393,421,545,553,609,636,639,641,644,647,649-652,665,748-749',
            'Zaman, Sayılar & Ölçüler': '11,53-54,76,99,107-122,138-142,336,419,531,537,539,577-579,634,950,989',
            'Eğitim & Akademik Hayat': '4-7,126-127,235,324,349-350,399,505-507,535-536,586-587,700,705',
            'İş, Kariyer & Ekonomi': '14-19,22-24,33,43-45,51,101,168-169,255,275,296,319-320,342,365,375,386-390,417-418,564,575,610,643,674,717,721,743,750,807,838,877',
            'Ulaşım & Yolculuk': '3,8-9,34,36,42,289,534,832,891,948,962',
            'Konum, Yön & Mekan': '79,86,157,267,325-326,408,436,497,515,522,528-530,625-633,981',
            'Hava, Doğa & Afetler': '56,60-62,70-74,80,82-85,129,159-160,162,166,498,533,673,853,909',
            'Ev, Eşya & Giyim': '77,100,104,269,315,429-430,442,495,509-510,637,779,839,842,847,887',
            'Yemek & Mutfak': '272,511,519-520,594-606,709,815,862,885',
            'Sağlık, Beden & Uyku': '59,177,248,259,274,276,330,504,516,557,570,611-612,655,706,719,723,755,781,814,822,827,850,859,863,867,888,906,1001',
            'İnsan, Aile & İlişkiler': '31,91,179,199,240,254,425,441,449,454,462,471,486,521,558,692,704,737,754,843,857,879,893,897,936-937,980,991',
            'Kişilik & Karakter': '48,180-195,214,253,523,562,576,589,668,747,764,784-786,806,892,935,938,965',
            'Duygular & Psikoloji': '52,134-136,156,178,241,244,246,260-261,264,270,290-293,295,400,440,448,473,513,556,559,648,662,676,678,688-689,730,766-768,780,800,824-825,833,855,884,915,918-919,921-922,926,934,970,982',
            'İletişim, Düşünce & Dil': '12,40,161,202-203,206,211,218,229,239,262,298,311,354,394-398,413,458,538,541,544,546,563,664,675,677,680-681,694,698,701,710,713,716,722,729,739,758-759,770,772-773,789,791,816,848,858,896,939,942,944-945,951,956,972,975,977,983,987,1002-1003',
            'Hukuk, Suç & Güvenlik': '133,247,327,409,422,445-446,455,474,478,483,517-518,532,567,573,658,679,685,693,695-696,711,714,734,757,762,765,797,809,811,865,878,881,973',
            'Toplum, Devlet & Kamu': '20-21,345-348,351,366-367,384-385,480-481,527,744,805,846,868,931',
            'Kültür, Sanat & Medya': '39,102,201,503,508,554-555,645,699,738,872,898,924,927,952-953,955',
            'Teknoloji, Araçlar & Nesneler': '501,608,672,732,845,854',
            'Hareket & Fiziksel Eylemler': '151,158,207,249-250,331,344,410,444,457,491-492,654,656,659,683,686-687,690-691,702,707-708,712,715,718,724-728,733,741-742,763,778,801,810,812-813,819-820,840,844,861,903-905,916,925,930,933',
            'Günlük Fiiller & Süreçler': '38,55,65-66,68,87-89,94-98,103,123,152-155,163-165,167,205,210,213,217,230-232,234,237,263,294,337-341,363-364,368-374,376,382-383,391,401,502,512,526,540,566,613,653,657,660-661,663,667,669-671,682,684,697,703,720,731,735-736,740,745,751,753,756,774,776,783,787-788,790,792-793,798-799,803,808,817,834-836,851-852,856,860,882,899,929,941,943,961,969,976,979,985',
            'Nitelikler, Durumlar & Sıfatlar': '2,10,32,57-58,75,81,125,212,215-216,219-221,223-227,236,238,242-243,273,280-285,287,303-305,314,328-329,343,353,362,377-381,407,411-412,414-416,420,423,427,432,435,437-438,456,460-461,463-465,493-494,496,500,514,524-525,542,547-551,580,588,638,746,760-761,771,775,777,782,796,821,823,829-830,837,841,864,866,871,880,894-895,900,902,907,910-914,917,920,923,940,947,949,957-959,963-964,968,993,997-1000',
            'Eş Anlamlılar': '196-198,200,204,208-209,828',
            'Zıt Anlamlılar': '402-406,424,426,428,433-434,439,443,447,459,472,475-477,479,482,484-485,489-490,499',
            'Argo & Sokak Dili': '543,581-585,614-624,640,666,890',
            'Hayvanlar, Tarım & Doğa': '228,251,256-258,752,870',
            'Matematik & Şekiller': '590-593,960',
            'Din, Mitoloji & İnanç': '128,252,488,802,818,873,886,994',
            'Soyut Kavramlar & Genel İsimler': '93,173,222,233,265-266,301,317,431,450-453,466-470,487,565,569,571,574,769,794-795,804,831,849,869,874-876,883,889,901,908,928,932,946,954,966-967,971,974,978,984,986,988,990,995-996',
            'Prefiksler': '1594-5000'
        };
    }

    buildCategoryBySourceLine() {
        return Object.entries(this.categoryLineSpecs).reduce((categoryMap, [category, lineSpec]) => {
            this.expandLineSpec(lineSpec).forEach(sourceLineNumber => {
                categoryMap.set(sourceLineNumber, category);
            });

            return categoryMap;
        }, new Map());
    }

    expandLineSpec(lineSpec) {
        return lineSpec.split(',').flatMap(part => {
            const trimmedPart = part.trim();
            if (!trimmedPart) return [];

            const [start, end] = trimmedPart.split('-').map(value => Number(value));
            if (!Number.isInteger(start)) return [];
            if (!Number.isInteger(end)) return [start];

            return Array.from({ length: end - start + 1 }, (_, index) => start + index);
        });
    }

    getCategory(word, sourceLineNumber) {
        const category = this.categoryBySourceLine.get(Number(sourceLineNumber));
        return category || word?.category || this.fallbackCategory;
    }

    getIcon(categoryName) {
        return this.getDefinition(categoryName)?.icon || '📓';
    }

    getDefinition(categoryName) {
        return this.categoryDefinitions.find(definition => definition.name === categoryName) || null;
    }

    getSortIndex(categoryName) {
        const index = this.categoryDefinitions.findIndex(definition => definition.name === categoryName);
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    }

    sortCategories(categories) {
        return [...categories].sort((firstCategory, secondCategory) => {
            const firstIndex = this.getSortIndex(firstCategory);
            const secondIndex = this.getSortIndex(secondCategory);
            if (firstIndex !== secondIndex) return firstIndex - secondIndex;
            return firstCategory.localeCompare(secondCategory, 'tr');
        });
    }
}

window.wordCategoryManager = new WordCategoryManager();
