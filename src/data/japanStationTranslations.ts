/**
 * Japan station name translations and line colors
 * Covers both Kansai (Osaka, Kyoto, Kobe, Nara) and Tokyo regions
 *
 * Sources:
 * - https://en.wikipedia.org/wiki/Osaka_Metro
 * - https://www.kyotostation.com/kyoto-subway-lines/
 * - https://metronine.osaka/en/metro_station/
 * - https://en.wikipedia.org/wiki/Tokyo_Metro
 * - https://en.wikipedia.org/wiki/Toei_Subway
 */

// Line colors for Japan railways (Kansai + Tokyo)
export const JAPAN_LINE_COLORS: Record<string, string> = {
  // JR West lines
  'JR京都線': '#0072bc',
  'JR神戸線': '#0072bc',
  'JR東西線': '#ff69b4',
  '東海道本線': '#0072bc',
  '大阪環状線': '#e60012',
  '阪和線': '#f15a22',
  '関西本線': '#009944',
  '関西線': '#009944',
  '奈良線': '#a52a2a',
  '嵯峨野線': '#8b4513',
  '山陰本線': '#8b4513',
  '山陰線': '#8b4513',
  '湖西線': '#00a0e9',
  '東海道新幹線': '#0072bc',
  '山陽新幹線': '#0072bc',
  '山陽線': '#0072bc',
  '福知山線': '#ffd400',
  '片町線': '#ff69b4',
  '桜島線': '#e60012',
  'おおさか東線': '#9acd32',

  // Keihan Railway - Green
  '京阪本線': '#008000',
  '京阪鴨東線': '#008000',
  '鴨東線': '#008000',
  '京阪中之島線': '#008000',
  '中之島線': '#008000',
  '京阪宇治線': '#008000',
  '宇治線': '#008000',
  '京阪交野線': '#008000',
  '交野線': '#008000',
  '京阪京津線': '#008000',
  '京津線': '#008000',
  '京阪石山坂本線': '#008000',
  '石山坂本線': '#008000',
  '本線': '#008000',

  // Hankyu Railway - Maroon
  '阪急京都本線': '#800000',
  '阪急京都線': '#800000',
  '京都線': '#800000',
  '阪急神戸本線': '#800000',
  '阪急神戸線': '#800000',
  '神戸線': '#800000',
  '阪急宝塚本線': '#800000',
  '阪急宝塚線': '#800000',
  '宝塚線': '#800000',
  '阪急千里線': '#800000',
  '千里線': '#800000',
  '阪急嵐山線': '#800000',
  '嵐山線': '#800000',
  '今津線': '#800000',
  '伊丹線': '#800000',
  '甲陽線': '#800000',
  '箕面線': '#800000',
  '神戸高速線': '#800000',

  // Kintetsu Railway - Red
  '近鉄京都線': '#e60012',
  '近鉄奈良線': '#e60012',
  '近鉄大阪線': '#e60012',
  '大阪線': '#e60012',
  '近鉄南大阪線': '#e60012',
  '南大阪線': '#e60012',
  '近鉄難波線': '#e60012',
  '難波線': '#e60012',
  '橿原線': '#e60012',
  '天理線': '#e60012',
  '生駒線': '#e60012',
  'けいはんな線': '#e60012',

  // Osaka Metro
  '大阪市高速電気軌道御堂筋線': '#e5171f',
  '御堂筋線': '#e5171f',
  '1号線(御堂筋線)': '#e5171f',
  '大阪市高速電気軌道谷町線': '#522886',
  '谷町線': '#522886',
  '2号線(谷町線)': '#522886',
  '大阪市高速電気軌道四つ橋線': '#0078ba',
  '四つ橋線': '#0078ba',
  '3号線(四つ橋線)': '#0078ba',
  '大阪市高速電気軌道中央線': '#019a66',
  '中央線': '#019a66',
  '4号線(中央線)': '#019a66',
  '大阪市高速電気軌道千日前線': '#e44d93',
  '千日前線': '#e44d93',
  '5号線(千日前線)': '#e44d93',
  '大阪市高速電気軌道堺筋線': '#814721',
  '堺筋線': '#814721',
  '6号線(堺筋線)': '#814721',
  '大阪市高速電気軌道長堀鶴見緑地線': '#a9cc51',
  '長堀鶴見緑地線': '#a9cc51',
  '7号線(長堀鶴見緑地線)': '#a9cc51',
  '大阪市高速電気軌道今里筋線': '#ee7b1a',
  '今里筋線': '#ee7b1a',
  '8号線（今里筋線）': '#ee7b1a',
  '南港ポートタウン線': '#00b2b2',

  // Kyoto Municipal Subway
  '京都市営地下鉄烏丸線': '#31a354',
  '烏丸線': '#31a354',
  '京都市営地下鉄東西線': '#e85298',
  '東西線': '#e85298',

  // Kobe Municipal Subway
  '西神線': '#008000',
  '西神延伸線': '#008000',
  '海岸線': '#0078ba',
  '北神線': '#008000',

  // Hanshin Railway - Orange
  '阪神本線': '#f15a22',
  '阪神なんば線': '#f15a22',
  '武庫川線': '#f15a22',

  // Nankai Railway - Blue
  '南海本線': '#0072bc',
  '南海高野線': '#0072bc',
  '高野線': '#0072bc',
  '泉北高速鉄道線': '#0072bc',

  // Eizan Railway - Green
  '叡山本線': '#008000',
  '鞍馬線': '#008000',

  // Keifuku (Randen) - Purple
  '嵐山本線': '#800080',
  '北野線': '#800080',

  // Osaka Monorail - Blue
  '大阪モノレール線': '#00a0e9',

  // Port Liner / Rokko Liner - Teal
  'ポートアイランド線': '#00b2b2',
  '六甲アイランド線': '#00b2b2',

  // Nose Electric Railway - Orange
  '妙見線': '#f15a22',
  '日生線': '#f15a22',

  // Kobe Electric Railway - Orange
  '有馬線': '#f15a22',
  '粟生線': '#f15a22',

  // Hankai Tramway - Green
  '阪堺線': '#008000',
  '上町線': '#008000',

  // ==========================================
  // TOKYO REGION (Complete)
  // ==========================================

  // Tokyo Metro
  '10号線新宿線': '#6CBB5A',  // Shinjuku Line
  '11号線半蔵門線': '#8F76D6',  // Hanzomon Line
  '12号線大江戸線': '#B6007A',  // Oedo Line
  '13号線副都心線': '#9C5E31',  // Fukutoshin Line
  '1号線浅草線': '#E85298',  // Asakusa Line
  '1号線銀座線': '#FF9500',  // Ginza Line
  '2号線日比谷線': '#B5B5AC',  // Hibiya Line
  '3号線': '#FF9500',  // Ginza Line
  '3号線銀座線': '#FF9500',  // Ginza Line
  '4号線': '#F62E36',  // Marunouchi Line
  '4号線丸ノ内線': '#F62E36',  // Marunouchi Line
  '4号線丸ノ内線分岐線': '#F62E36',  // Marunouchi Branch Line
  '5号線東西線': '#009BBF',  // Tozai Line
  '6号線三田線': '#0079C2',  // Mita Line
  '7号線南北線': '#00AC9B',  // Namboku Line
  '8号線有楽町線': '#C1A470',  // Yurakucho Line
  '9号線千代田線': '#00A650',  // Chiyoda Line
  '銀座線': '#FF9500',  // Ginza Line
  '日比谷線': '#B5B5AC',  // Hibiya Line
  '丸ノ内線': '#F62E36',  // Marunouchi Line
  '千代田線': '#00A650',  // Chiyoda Line
  '有楽町線': '#C1A470',  // Yurakucho Line
  '半蔵門線': '#8F76D6',  // Hanzomon Line
  '南北線': '#00AC9B',  // Namboku Line
  '副都心線': '#9C5E31',  // Fukutoshin Line

  // Toei Subway
  '浅草線': '#E85298',  // Asakusa Line
  '三田線': '#0079C2',  // Mita Line
  '新宿線': '#6CBB5A',  // Shinjuku Line
  '大江戸線': '#B6007A',  // Oedo Line

  // JR East
  '山手線': '#9ACD32',  // Yamanote Line
  '中央線': '#FF4500',  // Chuo Line
  '中央線快速': '#FF4500',  // Chuo Rapid Line
  '中央・総武線': '#FFD700',  // Chuo-Sobu Line
  '総武線': '#FFD700',  // Sobu Line
  '総武本線': '#FFD700',  // Sobu Line
  '京浜東北線': '#00BFFF',  // Keihin-Tohoku Line
  '東海道線': '#FF8C00',  // Tokaido Line
  '東海道新幹線': '#0072BC',  // Tokaido Shinkansen
  '横須賀線': '#0F4C9A',  // Yokosuka Line
  '埼京線': '#228B22',  // Saikyo Line
  '赤羽線（埼京線）': '#228B22',  // Saikyo Line
  '東北線（埼京線）': '#228B22',  // Saikyo Line
  '湘南新宿ライン': '#FF4500',  // Shonan-Shinjuku Line
  '常磐線': '#00B261',  // Joban Line
  '常磐線快速': '#00B261',  // Joban Rapid Line
  '常磐新線': '#0066CC',  // Tsukuba Express
  '京葉線': '#C9242F',  // Keiyo Line
  '武蔵野線': '#FF6600',  // Musashino Line
  '南武線': '#FFD400',  // Nambu Line
  '横浜線': '#7CFC00',  // Yokohama Line
  '青梅線': '#FF4500',  // Ome Line
  '五日市線': '#FF4500',  // Itsukaichi Line
  '八高線': '#8B4513',  // Hachiko Line
  '高崎線': '#FF8C00',  // Takasaki Line
  '宇都宮線': '#FF8C00',  // Utsunomiya Line
  '東北線': '#F68B1E',  // Tohoku Line
  '東北本線': '#F68B1E',  // Tohoku Line
  '東北新幹線': '#00B261',  // Tohoku Shinkansen
  '鶴見線': '#FFCC00',  // Tsurumi Line

  // Tokyu Railways
  '東横線': '#DA0442',  // Tokyu Toyoko Line
  '東急東横線': '#DA0442',  // Tokyu Toyoko Line
  '田園都市線': '#00A040',  // Tokyu Den-en-toshi Line
  '東急田園都市線': '#00A040',  // Tokyu Den-en-toshi Line
  '目黒線': '#009CD2',  // Tokyu Meguro Line
  '東急目黒線': '#009CD2',  // Tokyu Meguro Line
  '大井町線': '#F18C00',  // Tokyu Oimachi Line
  '東急大井町線': '#F18C00',  // Tokyu Oimachi Line
  '池上線': '#EE86A7',  // Tokyu Ikegami Line
  '東急池上線': '#EE86A7',  // Tokyu Ikegami Line
  '多摩川線': '#AE0378',  // Tokyu Tamagawa Line
  '東急多摩川線': '#AE0378',  // Tokyu Tamagawa Line
  '世田谷線': '#EE86A7',  // Tokyu Setagaya Line
  'こどもの国線': '#45B8E8',  // Kodomonokuni Line

  // Odakyu
  '小田急線': '#1E90FF',  // Odakyu Line
  '小田原線': '#1E90FF',  // Odakyu Odawara Line
  '小田急小田原線': '#1E90FF',  // Odakyu Odawara Line
  '江ノ島線': '#1E90FF',  // Odakyu Enoshima Line
  '小田急江ノ島線': '#1E90FF',  // Odakyu Enoshima Line
  '多摩線': '#1E90FF',  // Odakyu Tama Line
  '小田急多摩線': '#1E90FF',  // Odakyu Tama Line

  // Keio
  '京王線': '#DD0077',  // Keio Line
  '井の頭線': '#1E90FF',  // Keio Inokashira Line
  '京王井の頭線': '#1E90FF',  // Keio Inokashira Line
  '相模原線': '#DD0077',  // Keio Sagamihara Line
  '京王相模原線': '#DD0077',  // Keio Sagamihara Line
  '動物園線': '#DD0077',  // Keio Dobutsuen Line
  '競馬場線': '#DD0077',  // Keio Keibajo Line

  // Seibu
  '池袋線': '#003399',  // Seibu Ikebukuro Line
  '西武池袋線': '#003399',  // Seibu Ikebukuro Line
  '西武新宿線': '#003399',  // Seibu Shinjuku Line
  '拝島線': '#003399',  // Seibu Haijima Line
  '多摩湖線': '#003399',  // Seibu Tamako Line
  '国分寺線': '#003399',  // Seibu Kokubunji Line
  '西武園線': '#003399',  // Seibu-en Line
  '西武有楽町線': '#003399',  // Seibu Yurakucho Line
  '狭山線': '#003399',  // Seibu Sayama Line
  '豊島線': '#003399',  // Seibu Toshima Line
  '山口線': '#003399',  // Seibu Yamaguchi Line

  // Tobu
  '東上本線': '#0060CF',  // Tobu Tojo Line
  '東武東上線': '#0060CF',  // Tobu Tojo Line
  '伊勢崎線': '#0060CF',  // Tobu Isesaki Line
  '東武伊勢崎線': '#0060CF',  // Tobu Isesaki Line
  '東武スカイツリーライン': '#0060CF',  // Tobu Skytree Line
  '亀戸線': '#0060CF',  // Tobu Kameido Line
  '大師線': '#0060CF',  // Tobu Daishi Line
  '野田線': '#0060CF',  // Tobu Urban Park Line

  // Keisei
  '本線': '#1E50A2',  // Keisei Main Line
  '京成本線': '#1E50A2',  // Keisei Main Line
  '押上線': '#1E50A2',  // Keisei Oshiage Line
  '京成押上線': '#1E50A2',  // Keisei Oshiage Line
  '金町線': '#1E50A2',  // Keisei Kanamachi Line
  '成田空港線': '#1E50A2',  // Narita Sky Access

  // Keikyu
  '空港線': '#E8334A',  // Keikyu Airport Line
  '京急本線': '#E8334A',  // Keikyu Main Line
  '京急線': '#E8334A',  // Keikyu Line

  // Other railways
  'りんかい線': '#00A3E0',  // Rinkai Line
  '東京臨海新交通臨海線': '#00B7CE',  // Yurikamome
  'ゆりかもめ': '#00B7CE',  // Yurikamome
  '東京モノレール羽田線': '#00A7DB',  // Tokyo Monorail
  '東京モノレール': '#00A7DB',  // Tokyo Monorail
  '多摩都市モノレール線': '#F39800',  // Tama Monorail
  '多摩モノレール': '#F39800',  // Tama Monorail
  '日暮里・舎人線': '#FF69B4',  // Nippori-Toneri Liner
  '日暮里・舎人ライナー': '#FF69B4',  // Nippori-Toneri Liner
  '埼玉高速鉄道線': '#2C74BE',  // Saitama Railway
  '北総線': '#0080C6',  // Hokuso Line
  '東葉高速線': '#2FA8E0',  // Toyo Rapid Railway
  '新京成線': '#E85298',  // Shin-Keisei Line
  '流山線': '#00A650',  // Nagareyama Line
  '荒川線': '#FFC20E',  // Tokyo Sakura Tram
  'ディズニーリゾートライン': '#E7348E',  // Disney Resort Line
  '上野懸垂線': '#228B22',  // Ueno Zoo Monorail
  'つくばエクスプレス': '#0066CC',  // Tsukuba Express

  // Default
  'transfer': '#999999',
};

// Station name translations (Japanese → English romanization)
// Key: Japanese station name, Value: English/Romanized name
export const STATION_TRANSLATIONS: Record<string, string> = {
  // Kyoto Municipal Subway - Karasuma Line (K)
  '国際会館': 'Kokusaikaikan',
  '松ヶ崎': 'Matsugasaki',
  '北山': 'Kitayama',
  '北大路': 'Kitaoji',
  '鞍馬口': 'Kuramaguchi',
  '今出川': 'Imadegawa',
  '丸太町': 'Marutamachi',
  '烏丸御池': 'Karasuma Oike',
  '四条': 'Shijo',
  '五条': 'Gojo',
  '京都': 'Kyoto',
  '九条': 'Kujo',
  '十条': 'Jujo',
  'くいな橋': 'Kuinabashi',
  '竹田': 'Takeda',

  // Kyoto Municipal Subway - Tozai Line (T)
  '太秦天神川': 'Uzumasa Tenjingawa',
  '蚕ノ社': 'Kaiko-no-Yashiro',
  '西大路御池': 'Nishioji Oike',
  '二条': 'Nijo',
  '二条城前': 'Nijojo-mae',
  '京都市役所前': 'Kyoto Shiyakusho-mae',
  '三条京阪': 'Sanjo Keihan',
  '東山': 'Higashiyama',
  '蹴上': 'Keage',
  '御陵': 'Misasagi',
  '山科': 'Yamashina',
  '東野': 'Higashino',
  '椥辻': 'Nagitsuji',
  '小野': 'Ono',
  '醍醐': 'Daigo',
  '石田': 'Ishida',
  '六地蔵': 'Rokujizo',

  // Osaka Metro - Midosuji Line (M)
  '江坂': 'Esaka',
  '東三国': 'Higashi-Mikuni',
  '新大阪': 'Shin-Osaka',
  '西中島南方': 'Nishinakajima-Minamigata',
  '中津': 'Nakatsu',
  '梅田': 'Umeda',
  '淀屋橋': 'Yodoyabashi',
  '本町': 'Hommachi',
  '心斎橋': 'Shinsaibashi',
  'なんば': 'Namba',
  '難波': 'Namba',
  '大国町': 'Daikokucho',
  '動物園前': 'Dobutsuen-mae',
  '天王寺': 'Tennoji',
  '昭和町': 'Showa-cho',
  '西田辺': 'Nishi-Tanabe',
  '長居': 'Nagai',
  'あびこ': 'Abiko',
  '北花田': 'Kita-Hanada',
  '新金岡': 'Shin-Kanaoka',
  'なかもず': 'Nakamozu',
  '中百舌鳥': 'Nakamozu',

  // Osaka Metro - Tanimachi Line (T)
  '大日': 'Dainichi',
  '守口': 'Moriguchi',
  '太子橋今市': 'Taishihashi-Imaichi',
  '千林大宮': 'Senbayashi-Omiya',
  '関目高殿': 'Sekime-Takadono',
  '野江内代': 'Noe-Uchindai',
  '都島': 'Miyakojima',
  '天神橋筋六丁目': 'Tenjimbashisuji 6-chome',
  '中崎町': 'Nakazaki-cho',
  '東梅田': 'Higashi-Umeda',
  '南森町': 'Minami-Morimachi',
  '天満橋': 'Temmabashi',
  '谷町四丁目': 'Tanimachi 4-chome',
  '谷町六丁目': 'Tanimachi 6-chome',
  '谷町九丁目': 'Tanimachi 9-chome',
  '四天王寺前夕陽ヶ丘': 'Shitennoji-mae Yuhigaoka',
  '阿倍野': 'Abeno',
  '文の里': 'Fuminosato',
  '田辺': 'Tanabe',
  '駒川中野': 'Komagawa-Nakano',
  '平野': 'Hirano',
  '喜連瓜破': 'Kire-Uriwari',
  '出戸': 'Deto',
  '長原': 'Nagahara',
  '八尾南': 'Yao-Minami',

  // Osaka Metro - Yotsubashi Line (Y)
  '西梅田': 'Nishi-Umeda',
  '肥後橋': 'Higobashi',
  '四ツ橋': 'Yotsubashi',
  '岸里': 'Kishinosato',
  '玉出': 'Tamade',
  '北加賀屋': 'Kita-Kagaya',
  '住之江公園': 'Suminoe-koen',

  // Osaka Metro - Chuo Line (C)
  'コスモスクエア': 'Cosmosquare',
  '大阪港': 'Osakako',
  '朝潮橋': 'Asashiobashi',
  '弁天町': 'Bentencho',
  '九条': 'Kujo',
  '阿波座': 'Awaza',
  '堺筋本町': 'Sakaisuji-Hommachi',
  '森ノ宮': 'Morinomiya',
  '緑橋': 'Midoribashi',
  '深江橋': 'Fukaebashi',
  '高井田': 'Takaida',
  '長田': 'Nagata',
  '生駒': 'Ikoma',
  '学研奈良登美ヶ丘': 'Gakken-Nara-Tomigaoka',

  // Osaka Metro - Sennichimae Line (S)
  '野田阪神': 'Noda-Hanshin',
  '玉川': 'Tamagawa',
  '西長堀': 'Nishi-Nagahori',
  '桜川': 'Sakuragawa',
  '日本橋': 'Nippombashi',
  '鶴橋': 'Tsuruhashi',
  '今里': 'Imazato',
  '新深江': 'Shin-Fukaebashi',
  '小路': 'Shoji',
  '北巽': 'Kita-Tatsumi',
  '南巽': 'Minami-Tatsumi',

  // Osaka Metro - Sakaisuji Line (K)
  '天神橋筋六丁目': 'Tenjimbashisuji 6-chome',
  '扇町': 'Ogimachi',
  '北浜': 'Kitahama',
  '長堀橋': 'Nagahoribashi',
  '恵美須町': 'Ebisucho',
  '動物園前': 'Dobutsuen-mae',
  '天下茶屋': 'Tengachaya',

  // Hankyu Kyoto Line
  '河原町': 'Kawaramachi',
  '祇園四条': 'Gion-Shijo',
  '大宮': 'Omiya',
  '西院': 'Saiin',
  '西京極': 'Nishi-Kyogoku',
  '桂': 'Katsura',
  '洛西口': 'Rakusaiguchi',
  '東向日': 'Higashi-Muko',
  '西向日': 'Nishi-Muko',
  '長岡天神': 'Nagaoka-Tenjin',
  '西山天王山': 'Nishiyama-Tennozan',
  '大山崎': 'Oyamazaki',
  '水無瀬': 'Minase',
  '上牧': 'Kamimai',
  '高槻市': 'Takatsuki-shi',
  '富田': 'Tonda',
  '総持寺': 'Sojiji',
  '茨木市': 'Ibaraki-shi',
  '南茨木': 'Minami-Ibaraki',
  '摂津市': 'Settsu-shi',
  '正雀': 'Shojaku',
  '相川': 'Aikawa',
  '上新庄': 'Kami-Shinjo',
  '淡路': 'Awaji',
  '崇禅寺': 'Sozenji',
  '南方': 'Minamikata',
  '十三': 'Juso',

  // Keihan Main Line
  '出町柳': 'Demachiyanagi',
  '神宮丸太町': 'Jingu-Marutamachi',
  '清水五条': 'Kiyomizu-Gojo',
  '七条': 'Shichijo',
  '東福寺': 'Tofukuji',
  '鳥羽街道': 'Toba-Kaido',
  '伏見稲荷': 'Fushimi-Inari',
  '深草': 'Fukakusa',
  '藤森': 'Fujinomori',
  '墨染': 'Sumizome',
  '丹波橋': 'Tambabashi',
  '伏見桃山': 'Fushimi-Momoyama',
  '中書島': 'Chushojima',
  '淀': 'Yodo',
  '石清水八幡宮': 'Iwashimizu-Hachimangu',
  '橋本': 'Hashimoto',
  '樟葉': 'Kuzuha',
  '牧野': 'Makino',
  '御殿山': 'Gotenyama',
  '枚方市': 'Hirakata-shi',
  '枚方公園': 'Hirakata-koen',
  '光善寺': 'Kozenji',
  '香里園': 'Korien',
  '寝屋川市': 'Neyagawa-shi',
  '萱島': 'Kayashima',
  '門真市': 'Kadoma-shi',
  '西三荘': 'Nishi-Sanso',
  '守口市': 'Moriguchi-shi',
  '土居': 'Doi',
  '滝井': 'Takii',
  '千林': 'Senbayashi',
  '森小路': 'Morishoji',
  '関目': 'Sekime',
  '野江': 'Noe',
  '京橋': 'Kyobashi',
  '天満橋': 'Temmabashi',
  '北浜': 'Kitahama',
  '淀屋橋': 'Yodoyabashi',

  // JR Stations
  '大阪': 'Osaka',
  '新大阪': 'Shin-Osaka',
  '高槻': 'Takatsuki',
  '茨木': 'Ibaraki',
  '吹田': 'Suita',
  '尼崎': 'Amagasaki',
  '三ノ宮': 'Sannomiya',
  '神戸': 'Kobe',
  '奈良': 'Nara',
  '嵐山': 'Arashiyama',
  '稲荷': 'Inari',
  '宇治': 'Uji',
  '桃山': 'Momoyama',
  '城陽': 'Joyo',
  '木津': 'Kizu',
  '加茂': 'Kamo',
  '亀岡': 'Kameoka',
  '園部': 'Sonobe',
  '福知山': 'Fukuchiyama',
  '二条': 'Nijo',
  '花園': 'Hanazono',
  '太秦': 'Uzumasa',
  '嵯峨嵐山': 'Saga-Arashiyama',
  '保津峡': 'Hozukyo',
  '馬堀': 'Umahori',

  // Additional common stations
  '祇園': 'Gion',
  '清水寺': 'Kiyomizu-dera',
  '金閣寺': 'Kinkaku-ji',
  '銀閣寺': 'Ginkaku-ji',
  '伏見': 'Fushimi',
  '嵯峨': 'Saga',
  '太秦': 'Uzumasa',
};

// Line name translations (Japanese → English)
export const LINE_TRANSLATIONS: Record<string, string> = {
  // Kyoto Municipal Subway
  '京都市営地下鉄烏丸線': 'Karasuma Line',
  '烏丸線': 'Karasuma Line',
  '京都市営地下鉄東西線': 'Tozai Line',
  '東西線': 'Tozai Line',

  // Osaka Metro
  '大阪市高速電気軌道御堂筋線': 'Midosuji Line',
  '御堂筋線': 'Midosuji Line',
  '大阪市高速電気軌道谷町線': 'Tanimachi Line',
  '谷町線': 'Tanimachi Line',
  '大阪市高速電気軌道四つ橋線': 'Yotsubashi Line',
  '四つ橋線': 'Yotsubashi Line',
  '大阪市高速電気軌道中央線': 'Chuo Line',
  '中央線': 'Chuo Line',
  '大阪市高速電気軌道千日前線': 'Sennichimae Line',
  '千日前線': 'Sennichimae Line',
  '大阪市高速電気軌道堺筋線': 'Sakaisuji Line',
  '堺筋線': 'Sakaisuji Line',
  '大阪市高速電気軌道長堀鶴見緑地線': 'Nagahori Tsurumi-ryokuchi Line',
  '長堀鶴見緑地線': 'Nagahori Tsurumi-ryokuchi Line',
  '大阪市高速電気軌道今里筋線': 'Imazatosuji Line',
  '今里筋線': 'Imazatosuji Line',

  // Hankyu Railway
  '阪急京都本線': 'Hankyu Kyoto Line',
  '阪急京都線': 'Hankyu Kyoto Line',
  '阪急神戸本線': 'Hankyu Kobe Line',
  '阪急神戸線': 'Hankyu Kobe Line',
  '阪急宝塚本線': 'Hankyu Takarazuka Line',
  '阪急宝塚線': 'Hankyu Takarazuka Line',
  '阪急千里線': 'Hankyu Senri Line',
  '阪急嵐山線': 'Hankyu Arashiyama Line',

  // Keihan Railway
  '京阪本線': 'Keihan Main Line',
  '京阪鴨東線': 'Keihan Oto Line',
  '京阪中之島線': 'Keihan Nakanoshima Line',
  '京阪宇治線': 'Keihan Uji Line',
  '京阪交野線': 'Keihan Katano Line',
  '京阪京津線': 'Keihan Keishin Line',
  '京阪石山坂本線': 'Keihan Ishiyama-Sakamoto Line',

  // Kintetsu Railway
  '近鉄京都線': 'Kintetsu Kyoto Line',
  '近鉄奈良線': 'Kintetsu Nara Line',
  '近鉄大阪線': 'Kintetsu Osaka Line',
  '近鉄南大阪線': 'Kintetsu Minami-Osaka Line',
  '近鉄難波線': 'Kintetsu Namba Line',

  // JR West
  'JR京都線': 'JR Kyoto Line',
  'JR神戸線': 'JR Kobe Line',
  '東海道本線': 'Tokaido Line',
  '大阪環状線': 'Osaka Loop Line',
  '阪和線': 'Hanwa Line',
  '関西本線': 'Kansai Line',
  '奈良線': 'Nara Line',
  '嵯峨野線': 'Sagano Line',
  '山陰本線': 'San\'in Line',
  '湖西線': 'Kosei Line',

  // Hanshin Railway
  '阪神本線': 'Hanshin Main Line',
  '阪神なんば線': 'Hanshin Namba Line',

  // Nankai Railway
  '南海本線': 'Nankai Main Line',
  '南海高野線': 'Nankai Koya Line',

  // ==========================================
  // TOKYO REGION (Complete)
  // ==========================================

  // Tokyo Metro
  '10号線新宿線': 'Shinjuku Line',
  '11号線半蔵門線': 'Hanzomon Line',
  '12号線大江戸線': 'Oedo Line',
  '13号線副都心線': 'Fukutoshin Line',
  '1号線浅草線': 'Asakusa Line',
  '1号線銀座線': 'Ginza Line',
  '2号線日比谷線': 'Hibiya Line',
  '3号線': 'Ginza Line',
  '3号線銀座線': 'Ginza Line',
  '4号線': 'Marunouchi Line',
  '4号線丸ノ内線': 'Marunouchi Line',
  '4号線丸ノ内線分岐線': 'Marunouchi Branch Line',
  '5号線東西線': 'Tozai Line',
  '6号線三田線': 'Mita Line',
  '7号線南北線': 'Namboku Line',
  '8号線有楽町線': 'Yurakucho Line',
  '9号線千代田線': 'Chiyoda Line',
  '銀座線': 'Ginza Line',
  '日比谷線': 'Hibiya Line',
  '丸ノ内線': 'Marunouchi Line',
  '千代田線': 'Chiyoda Line',
  '有楽町線': 'Yurakucho Line',
  '半蔵門線': 'Hanzomon Line',
  '南北線': 'Namboku Line',
  '副都心線': 'Fukutoshin Line',

  // Toei Subway
  '浅草線': 'Asakusa Line',
  '三田線': 'Mita Line',
  '新宿線': 'Shinjuku Line',
  '大江戸線': 'Oedo Line',

  // JR East
  '山手線': 'Yamanote Line',
  '中央線': 'Chuo Line',
  '中央線快速': 'Chuo Rapid Line',
  '中央・総武線': 'Chuo-Sobu Line',
  '総武線': 'Sobu Line',
  '総武本線': 'Sobu Line',
  '京浜東北線': 'Keihin-Tohoku Line',
  '東海道線': 'Tokaido Line',
  '東海道新幹線': 'Tokaido Shinkansen',
  '横須賀線': 'Yokosuka Line',
  '埼京線': 'Saikyo Line',
  '赤羽線（埼京線）': 'Saikyo Line',
  '東北線（埼京線）': 'Saikyo Line',
  '湘南新宿ライン': 'Shonan-Shinjuku Line',
  '常磐線': 'Joban Line',
  '常磐線快速': 'Joban Rapid Line',
  '常磐新線': 'Tsukuba Express',
  '京葉線': 'Keiyo Line',
  '武蔵野線': 'Musashino Line',
  '南武線': 'Nambu Line',
  '横浜線': 'Yokohama Line',
  '青梅線': 'Ome Line',
  '東北線': 'Tohoku Line',
  '東北新幹線': 'Tohoku Shinkansen',
  '鶴見線': 'Tsurumi Line',

  // Tokyu Railways
  '東横線': 'Tokyu Toyoko Line',
  '東急東横線': 'Tokyu Toyoko Line',
  '田園都市線': 'Tokyu Den-en-toshi Line',
  '東急田園都市線': 'Tokyu Den-en-toshi Line',
  '目黒線': 'Tokyu Meguro Line',
  '東急目黒線': 'Tokyu Meguro Line',
  '大井町線': 'Tokyu Oimachi Line',
  '東急大井町線': 'Tokyu Oimachi Line',
  '池上線': 'Tokyu Ikegami Line',
  '東急池上線': 'Tokyu Ikegami Line',
  '多摩川線': 'Tokyu Tamagawa Line',
  '東急多摩川線': 'Tokyu Tamagawa Line',
  '世田谷線': 'Tokyu Setagaya Line',
  'こどもの国線': 'Kodomonokuni Line',

  // Odakyu
  '小田急線': 'Odakyu Line',
  '小田原線': 'Odakyu Odawara Line',
  '小田急小田原線': 'Odakyu Odawara Line',
  '江ノ島線': 'Odakyu Enoshima Line',
  '小田急江ノ島線': 'Odakyu Enoshima Line',
  '多摩線': 'Odakyu Tama Line',
  '小田急多摩線': 'Odakyu Tama Line',

  // Keio
  '京王線': 'Keio Line',
  '井の頭線': 'Keio Inokashira Line',
  '京王井の頭線': 'Keio Inokashira Line',
  '相模原線': 'Keio Sagamihara Line',
  '動物園線': 'Keio Dobutsuen Line',
  '競馬場線': 'Keio Keibajo Line',

  // Seibu
  '池袋線': 'Seibu Ikebukuro Line',
  '西武池袋線': 'Seibu Ikebukuro Line',
  '西武新宿線': 'Seibu Shinjuku Line',
  '拝島線': 'Seibu Haijima Line',
  '多摩湖線': 'Seibu Tamako Line',
  '国分寺線': 'Seibu Kokubunji Line',
  '西武園線': 'Seibu-en Line',
  '西武有楽町線': 'Seibu Yurakucho Line',
  '狭山線': 'Seibu Sayama Line',
  '豊島線': 'Seibu Toshima Line',
  '山口線': 'Seibu Yamaguchi Line',

  // Tobu
  '東上本線': 'Tobu Tojo Line',
  '東武東上線': 'Tobu Tojo Line',
  '伊勢崎線': 'Tobu Isesaki Line',
  '東武伊勢崎線': 'Tobu Isesaki Line',
  '東武スカイツリーライン': 'Tobu Skytree Line',
  '亀戸線': 'Tobu Kameido Line',
  '大師線': 'Tobu Daishi Line',
  '野田線': 'Tobu Urban Park Line',

  // Keisei
  '本線': 'Keisei Main Line',
  '京成本線': 'Keisei Main Line',
  '押上線': 'Keisei Oshiage Line',
  '京成押上線': 'Keisei Oshiage Line',
  '金町線': 'Keisei Kanamachi Line',
  '成田空港線': 'Narita Sky Access',

  // Keikyu
  '空港線': 'Keikyu Airport Line',
  '京急本線': 'Keikyu Main Line',
  '京急線': 'Keikyu Line',

  // Other railways
  'りんかい線': 'Rinkai Line',
  '東京臨海新交通臨海線': 'Yurikamome',
  'ゆりかもめ': 'Yurikamome',
  '東京モノレール羽田線': 'Tokyo Monorail',
  '東京モノレール': 'Tokyo Monorail',
  '多摩都市モノレール線': 'Tama Monorail',
  '多摩モノレール': 'Tama Monorail',
  '日暮里・舎人線': 'Nippori-Toneri Liner',
  '日暮里・舎人ライナー': 'Nippori-Toneri Liner',
  '埼玉高速鉄道線': 'Saitama Railway',
  '北総線': 'Hokuso Line',
  '東葉高速線': 'Toyo Rapid Railway',
  '新京成線': 'Shin-Keisei Line',
  '流山線': 'Nagareyama Line',
  '荒川線': 'Tokyo Sakura Tram',
  'ディズニーリゾートライン': 'Disney Resort Line',
  '上野懸垂線': 'Ueno Zoo Monorail',
  'つくばエクスプレス': 'Tsukuba Express',

  // Transfer
  'transfer': 'Transfer',
};

/**
 * Get English name for a Japanese station name
 */
export function getEnglishStationName(japaneseName: string): string {
  return STATION_TRANSLATIONS[japaneseName] || japaneseName;
}

/**
 * Get English name for a Japanese line name
 */
export function getEnglishLineName(japaneseName: string): string {
  return LINE_TRANSLATIONS[japaneseName] || japaneseName;
}

/**
 * Get line color for a line name
 */
export function getLineColor(lineName: string): string {
  return JAPAN_LINE_COLORS[lineName] || '#666666';
}

/**
 * Create a lookup map for station translations (for performance)
 */
export function createTranslationIndex(): Map<string, string> {
  return new Map(Object.entries(STATION_TRANSLATIONS));
}
