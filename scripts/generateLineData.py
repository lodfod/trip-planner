#!/usr/bin/env python3
"""
Generate comprehensive line colors and translations for Japan rail lines.
Outputs a JSON file that the frontend can load dynamically.
"""

import json
import os

# Official Tokyo railway line colors
TOKYO_LINES = {
    # Tokyo Metro (official colors from Tokyo Metro website)
    '銀座線': {'color': '#FF9500', 'en': 'Ginza Line'},
    '1号線銀座線': {'color': '#FF9500', 'en': 'Ginza Line'},
    '3号線銀座線': {'color': '#FF9500', 'en': 'Ginza Line'},
    '3号線': {'color': '#FF9500', 'en': 'Ginza Line'},
    '日比谷線': {'color': '#B5B5AC', 'en': 'Hibiya Line'},
    '2号線日比谷線': {'color': '#B5B5AC', 'en': 'Hibiya Line'},
    '丸ノ内線': {'color': '#F62E36', 'en': 'Marunouchi Line'},
    '4号線丸ノ内線': {'color': '#F62E36', 'en': 'Marunouchi Line'},
    '4号線': {'color': '#F62E36', 'en': 'Marunouchi Line'},
    '4号線丸ノ内線分岐線': {'color': '#F62E36', 'en': 'Marunouchi Branch Line'},
    '東西線': {'color': '#009BBF', 'en': 'Tozai Line'},
    '5号線東西線': {'color': '#009BBF', 'en': 'Tozai Line'},
    '千代田線': {'color': '#00A650', 'en': 'Chiyoda Line'},
    '9号線千代田線': {'color': '#00A650', 'en': 'Chiyoda Line'},
    '有楽町線': {'color': '#C1A470', 'en': 'Yurakucho Line'},
    '8号線有楽町線': {'color': '#C1A470', 'en': 'Yurakucho Line'},
    '半蔵門線': {'color': '#8F76D6', 'en': 'Hanzomon Line'},
    '11号線半蔵門線': {'color': '#8F76D6', 'en': 'Hanzomon Line'},
    '南北線': {'color': '#00AC9B', 'en': 'Namboku Line'},
    '7号線南北線': {'color': '#00AC9B', 'en': 'Namboku Line'},
    '副都心線': {'color': '#9C5E31', 'en': 'Fukutoshin Line'},
    '13号線副都心線': {'color': '#9C5E31', 'en': 'Fukutoshin Line'},

    # Toei Subway (official colors)
    '浅草線': {'color': '#E85298', 'en': 'Asakusa Line'},
    '1号線浅草線': {'color': '#E85298', 'en': 'Asakusa Line'},
    '三田線': {'color': '#0079C2', 'en': 'Mita Line'},
    '6号線三田線': {'color': '#0079C2', 'en': 'Mita Line'},
    '新宿線': {'color': '#6CBB5A', 'en': 'Shinjuku Line'},
    '10号線新宿線': {'color': '#6CBB5A', 'en': 'Shinjuku Line'},
    '大江戸線': {'color': '#B6007A', 'en': 'Oedo Line'},
    '12号線大江戸線': {'color': '#B6007A', 'en': 'Oedo Line'},

    # JR East lines
    '山手線': {'color': '#9ACD32', 'en': 'Yamanote Line'},
    '中央線': {'color': '#FF4500', 'en': 'Chuo Line'},
    '中央線快速': {'color': '#FF4500', 'en': 'Chuo Rapid Line'},
    '中央・総武線': {'color': '#FFD700', 'en': 'Chuo-Sobu Line'},
    '総武線': {'color': '#FFD700', 'en': 'Sobu Line'},
    '総武本線': {'color': '#FFD700', 'en': 'Sobu Line'},
    '京浜東北線': {'color': '#00BFFF', 'en': 'Keihin-Tohoku Line'},
    '東海道線': {'color': '#FF8C00', 'en': 'Tokaido Line'},
    '東海道新幹線': {'color': '#0072BC', 'en': 'Tokaido Shinkansen'},
    '横須賀線': {'color': '#0F4C9A', 'en': 'Yokosuka Line'},
    '埼京線': {'color': '#228B22', 'en': 'Saikyo Line'},
    '赤羽線（埼京線）': {'color': '#228B22', 'en': 'Saikyo Line'},
    '東北線（埼京線）': {'color': '#228B22', 'en': 'Saikyo Line'},
    '湘南新宿ライン': {'color': '#FF4500', 'en': 'Shonan-Shinjuku Line'},
    '常磐線': {'color': '#00B261', 'en': 'Joban Line'},
    '常磐線快速': {'color': '#00B261', 'en': 'Joban Rapid Line'},
    '常磐新線': {'color': '#0066CC', 'en': 'Tsukuba Express'},
    '京葉線': {'color': '#C9242F', 'en': 'Keiyo Line'},
    '武蔵野線': {'color': '#FF6600', 'en': 'Musashino Line'},
    '南武線': {'color': '#FFD400', 'en': 'Nambu Line'},
    '横浜線': {'color': '#7CFC00', 'en': 'Yokohama Line'},
    '青梅線': {'color': '#FF4500', 'en': 'Ome Line'},
    '東北線': {'color': '#F68B1E', 'en': 'Tohoku Line'},
    '東北本線': {'color': '#F68B1E', 'en': 'Tohoku Line'},
    '東北新幹線': {'color': '#00B261', 'en': 'Tohoku Shinkansen'},
    '鶴見線': {'color': '#FFCC00', 'en': 'Tsurumi Line'},

    # Tokyu Railways (official colors)
    '東横線': {'color': '#DA0442', 'en': 'Tokyu Toyoko Line'},
    '東急東横線': {'color': '#DA0442', 'en': 'Tokyu Toyoko Line'},
    '田園都市線': {'color': '#00A040', 'en': 'Tokyu Den-en-toshi Line'},
    '東急田園都市線': {'color': '#00A040', 'en': 'Tokyu Den-en-toshi Line'},
    '目黒線': {'color': '#009CD2', 'en': 'Tokyu Meguro Line'},
    '東急目黒線': {'color': '#009CD2', 'en': 'Tokyu Meguro Line'},
    '大井町線': {'color': '#F18C00', 'en': 'Tokyu Oimachi Line'},
    '東急大井町線': {'color': '#F18C00', 'en': 'Tokyu Oimachi Line'},
    '池上線': {'color': '#EE86A7', 'en': 'Tokyu Ikegami Line'},
    '東急池上線': {'color': '#EE86A7', 'en': 'Tokyu Ikegami Line'},
    '多摩川線': {'color': '#AE0378', 'en': 'Tokyu Tamagawa Line'},
    '東急多摩川線': {'color': '#AE0378', 'en': 'Tokyu Tamagawa Line'},
    '世田谷線': {'color': '#EE86A7', 'en': 'Tokyu Setagaya Line'},
    'こどもの国線': {'color': '#45B8E8', 'en': 'Kodomonokuni Line'},

    # Odakyu (blue)
    '小田急線': {'color': '#1E90FF', 'en': 'Odakyu Line'},
    '小田原線': {'color': '#1E90FF', 'en': 'Odakyu Odawara Line'},
    '小田急小田原線': {'color': '#1E90FF', 'en': 'Odakyu Odawara Line'},
    '江ノ島線': {'color': '#1E90FF', 'en': 'Odakyu Enoshima Line'},
    '小田急江ノ島線': {'color': '#1E90FF', 'en': 'Odakyu Enoshima Line'},
    '多摩線': {'color': '#1E90FF', 'en': 'Odakyu Tama Line'},
    '小田急多摩線': {'color': '#1E90FF', 'en': 'Odakyu Tama Line'},

    # Keio (magenta/cherry)
    '京王線': {'color': '#DD0077', 'en': 'Keio Line'},
    '井の頭線': {'color': '#1E90FF', 'en': 'Keio Inokashira Line'},
    '京王井の頭線': {'color': '#1E90FF', 'en': 'Keio Inokashira Line'},
    '相模原線': {'color': '#DD0077', 'en': 'Keio Sagamihara Line'},
    '動物園線': {'color': '#DD0077', 'en': 'Keio Dobutsuen Line'},
    '競馬場線': {'color': '#DD0077', 'en': 'Keio Keibajo Line'},

    # Seibu (blue/yellow)
    '池袋線': {'color': '#003399', 'en': 'Seibu Ikebukuro Line'},
    '西武池袋線': {'color': '#003399', 'en': 'Seibu Ikebukuro Line'},
    '西武新宿線': {'color': '#003399', 'en': 'Seibu Shinjuku Line'},
    '拝島線': {'color': '#003399', 'en': 'Seibu Haijima Line'},
    '多摩湖線': {'color': '#003399', 'en': 'Seibu Tamako Line'},
    '国分寺線': {'color': '#003399', 'en': 'Seibu Kokubunji Line'},
    '西武園線': {'color': '#003399', 'en': 'Seibu-en Line'},
    '西武有楽町線': {'color': '#003399', 'en': 'Seibu Yurakucho Line'},
    '狭山線': {'color': '#003399', 'en': 'Seibu Sayama Line'},
    '豊島線': {'color': '#003399', 'en': 'Seibu Toshima Line'},
    '山口線': {'color': '#003399', 'en': 'Seibu Yamaguchi Line'},

    # Tobu (orange/blue)
    '東上本線': {'color': '#0060CF', 'en': 'Tobu Tojo Line'},
    '東武東上線': {'color': '#0060CF', 'en': 'Tobu Tojo Line'},
    '伊勢崎線': {'color': '#0060CF', 'en': 'Tobu Isesaki Line'},
    '東武伊勢崎線': {'color': '#0060CF', 'en': 'Tobu Isesaki Line'},
    '東武スカイツリーライン': {'color': '#0060CF', 'en': 'Tobu Skytree Line'},
    '亀戸線': {'color': '#0060CF', 'en': 'Tobu Kameido Line'},
    '大師線': {'color': '#0060CF', 'en': 'Tobu Daishi Line'},
    '野田線': {'color': '#0060CF', 'en': 'Tobu Urban Park Line'},

    # Keisei (blue)
    '本線': {'color': '#1E50A2', 'en': 'Keisei Main Line'},
    '京成本線': {'color': '#1E50A2', 'en': 'Keisei Main Line'},
    '押上線': {'color': '#1E50A2', 'en': 'Keisei Oshiage Line'},
    '京成押上線': {'color': '#1E50A2', 'en': 'Keisei Oshiage Line'},
    '金町線': {'color': '#1E50A2', 'en': 'Keisei Kanamachi Line'},
    '成田空港線': {'color': '#1E50A2', 'en': 'Narita Sky Access'},

    # Keikyu (red)
    '空港線': {'color': '#E8334A', 'en': 'Keikyu Airport Line'},
    '京急本線': {'color': '#E8334A', 'en': 'Keikyu Main Line'},
    '京急線': {'color': '#E8334A', 'en': 'Keikyu Line'},

    # Other railways
    'りんかい線': {'color': '#00A3E0', 'en': 'Rinkai Line'},
    '東京臨海新交通臨海線': {'color': '#00B7CE', 'en': 'Yurikamome'},
    'ゆりかもめ': {'color': '#00B7CE', 'en': 'Yurikamome'},
    '東京モノレール羽田線': {'color': '#00A7DB', 'en': 'Tokyo Monorail'},
    '東京モノレール': {'color': '#00A7DB', 'en': 'Tokyo Monorail'},
    '多摩都市モノレール線': {'color': '#F39800', 'en': 'Tama Monorail'},
    '多摩モノレール': {'color': '#F39800', 'en': 'Tama Monorail'},
    '日暮里・舎人線': {'color': '#FF69B4', 'en': 'Nippori-Toneri Liner'},
    '日暮里・舎人ライナー': {'color': '#FF69B4', 'en': 'Nippori-Toneri Liner'},
    '埼玉高速鉄道線': {'color': '#2C74BE', 'en': 'Saitama Railway'},
    '北総線': {'color': '#0080C6', 'en': 'Hokuso Line'},
    '東葉高速線': {'color': '#2FA8E0', 'en': 'Toyo Rapid Railway'},
    '新京成線': {'color': '#E85298', 'en': 'Shin-Keisei Line'},
    '流山線': {'color': '#00A650', 'en': 'Nagareyama Line'},
    '荒川線': {'color': '#FFC20E', 'en': 'Tokyo Sakura Tram'},
    'ディズニーリゾートライン': {'color': '#E7348E', 'en': 'Disney Resort Line'},
    '上野懸垂線': {'color': '#228B22', 'en': 'Ueno Zoo Monorail'},
    'つくばエクスプレス': {'color': '#0066CC', 'en': 'Tsukuba Express'},
}

# Kansai region lines
KANSAI_LINES = {
    # JR West lines
    'JR京都線': {'color': '#0072bc', 'en': 'JR Kyoto Line'},
    'JR神戸線': {'color': '#0072bc', 'en': 'JR Kobe Line'},
    'JR東西線': {'color': '#ff69b4', 'en': 'JR Tozai Line'},
    '東海道本線': {'color': '#0072bc', 'en': 'Tokaido Line'},
    '大阪環状線': {'color': '#e60012', 'en': 'Osaka Loop Line'},
    '阪和線': {'color': '#f15a22', 'en': 'Hanwa Line'},
    '関西本線': {'color': '#009944', 'en': 'Kansai Line'},
    '関西線': {'color': '#009944', 'en': 'Kansai Line'},
    '奈良線': {'color': '#a52a2a', 'en': 'Nara Line'},
    '嵯峨野線': {'color': '#8b4513', 'en': 'Sagano Line'},
    '山陰本線': {'color': '#8b4513', 'en': "San'in Line"},
    '山陰線': {'color': '#8b4513', 'en': "San'in Line"},
    '湖西線': {'color': '#00a0e9', 'en': 'Kosei Line'},
    '山陽新幹線': {'color': '#0072bc', 'en': 'Sanyo Shinkansen'},
    '山陽線': {'color': '#0072bc', 'en': 'Sanyo Line'},
    '福知山線': {'color': '#ffd400', 'en': 'Fukuchiyama Line'},
    '片町線': {'color': '#ff69b4', 'en': 'Katamachi Line'},
    '桜島線': {'color': '#e60012', 'en': 'Sakurajima Line'},
    'おおさか東線': {'color': '#9acd32', 'en': 'Osaka Higashi Line'},

    # Keihan Railway - Green
    '京阪本線': {'color': '#008000', 'en': 'Keihan Main Line'},
    '京阪鴨東線': {'color': '#008000', 'en': 'Keihan Oto Line'},
    '鴨東線': {'color': '#008000', 'en': 'Keihan Oto Line'},
    '京阪中之島線': {'color': '#008000', 'en': 'Keihan Nakanoshima Line'},
    '中之島線': {'color': '#008000', 'en': 'Keihan Nakanoshima Line'},
    '京阪宇治線': {'color': '#008000', 'en': 'Keihan Uji Line'},
    '宇治線': {'color': '#008000', 'en': 'Keihan Uji Line'},
    '京阪交野線': {'color': '#008000', 'en': 'Keihan Katano Line'},
    '交野線': {'color': '#008000', 'en': 'Keihan Katano Line'},
    '京阪京津線': {'color': '#008000', 'en': 'Keihan Keishin Line'},
    '京津線': {'color': '#008000', 'en': 'Keihan Keishin Line'},
    '京阪石山坂本線': {'color': '#008000', 'en': 'Keihan Ishiyama-Sakamoto Line'},
    '石山坂本線': {'color': '#008000', 'en': 'Keihan Ishiyama-Sakamoto Line'},

    # Hankyu Railway - Maroon
    '阪急京都本線': {'color': '#800000', 'en': 'Hankyu Kyoto Line'},
    '阪急京都線': {'color': '#800000', 'en': 'Hankyu Kyoto Line'},
    '京都線': {'color': '#800000', 'en': 'Hankyu Kyoto Line'},
    '阪急神戸本線': {'color': '#800000', 'en': 'Hankyu Kobe Line'},
    '阪急神戸線': {'color': '#800000', 'en': 'Hankyu Kobe Line'},
    '神戸線': {'color': '#800000', 'en': 'Hankyu Kobe Line'},
    '阪急宝塚本線': {'color': '#800000', 'en': 'Hankyu Takarazuka Line'},
    '阪急宝塚線': {'color': '#800000', 'en': 'Hankyu Takarazuka Line'},
    '宝塚線': {'color': '#800000', 'en': 'Hankyu Takarazuka Line'},
    '阪急千里線': {'color': '#800000', 'en': 'Hankyu Senri Line'},
    '千里線': {'color': '#800000', 'en': 'Hankyu Senri Line'},
    '阪急嵐山線': {'color': '#800000', 'en': 'Hankyu Arashiyama Line'},
    '嵐山線': {'color': '#800000', 'en': 'Hankyu Arashiyama Line'},
    '今津線': {'color': '#800000', 'en': 'Hankyu Imazu Line'},
    '伊丹線': {'color': '#800000', 'en': 'Hankyu Itami Line'},
    '甲陽線': {'color': '#800000', 'en': 'Hankyu Koyo Line'},
    '箕面線': {'color': '#800000', 'en': 'Hankyu Minoo Line'},
    '神戸高速線': {'color': '#800000', 'en': 'Kobe Kosoku Line'},

    # Kintetsu Railway - Red
    '近鉄京都線': {'color': '#e60012', 'en': 'Kintetsu Kyoto Line'},
    '近鉄奈良線': {'color': '#e60012', 'en': 'Kintetsu Nara Line'},
    '近鉄大阪線': {'color': '#e60012', 'en': 'Kintetsu Osaka Line'},
    '大阪線': {'color': '#e60012', 'en': 'Kintetsu Osaka Line'},
    '近鉄南大阪線': {'color': '#e60012', 'en': 'Kintetsu Minami-Osaka Line'},
    '南大阪線': {'color': '#e60012', 'en': 'Kintetsu Minami-Osaka Line'},
    '近鉄難波線': {'color': '#e60012', 'en': 'Kintetsu Namba Line'},
    '難波線': {'color': '#e60012', 'en': 'Kintetsu Namba Line'},
    '橿原線': {'color': '#e60012', 'en': 'Kintetsu Kashihara Line'},
    '天理線': {'color': '#e60012', 'en': 'Kintetsu Tenri Line'},
    '生駒線': {'color': '#e60012', 'en': 'Kintetsu Ikoma Line'},
    'けいはんな線': {'color': '#e60012', 'en': 'Kintetsu Keihanna Line'},

    # Osaka Metro
    '大阪市高速電気軌道御堂筋線': {'color': '#e5171f', 'en': 'Midosuji Line'},
    '御堂筋線': {'color': '#e5171f', 'en': 'Midosuji Line'},
    '1号線(御堂筋線)': {'color': '#e5171f', 'en': 'Midosuji Line'},
    '大阪市高速電気軌道谷町線': {'color': '#522886', 'en': 'Tanimachi Line'},
    '谷町線': {'color': '#522886', 'en': 'Tanimachi Line'},
    '2号線(谷町線)': {'color': '#522886', 'en': 'Tanimachi Line'},
    '大阪市高速電気軌道四つ橋線': {'color': '#0078ba', 'en': 'Yotsubashi Line'},
    '四つ橋線': {'color': '#0078ba', 'en': 'Yotsubashi Line'},
    '3号線(四つ橋線)': {'color': '#0078ba', 'en': 'Yotsubashi Line'},
    '大阪市高速電気軌道中央線': {'color': '#019a66', 'en': 'Chuo Line'},
    '中央線': {'color': '#019a66', 'en': 'Chuo Line'},
    '4号線(中央線)': {'color': '#019a66', 'en': 'Chuo Line'},
    '大阪市高速電気軌道千日前線': {'color': '#e44d93', 'en': 'Sennichimae Line'},
    '千日前線': {'color': '#e44d93', 'en': 'Sennichimae Line'},
    '5号線(千日前線)': {'color': '#e44d93', 'en': 'Sennichimae Line'},
    '大阪市高速電気軌道堺筋線': {'color': '#814721', 'en': 'Sakaisuji Line'},
    '堺筋線': {'color': '#814721', 'en': 'Sakaisuji Line'},
    '6号線(堺筋線)': {'color': '#814721', 'en': 'Sakaisuji Line'},
    '大阪市高速電気軌道長堀鶴見緑地線': {'color': '#a9cc51', 'en': 'Nagahori Tsurumi-ryokuchi Line'},
    '長堀鶴見緑地線': {'color': '#a9cc51', 'en': 'Nagahori Tsurumi-ryokuchi Line'},
    '7号線(長堀鶴見緑地線)': {'color': '#a9cc51', 'en': 'Nagahori Tsurumi-ryokuchi Line'},
    '大阪市高速電気軌道今里筋線': {'color': '#ee7b1a', 'en': 'Imazatosuji Line'},
    '今里筋線': {'color': '#ee7b1a', 'en': 'Imazatosuji Line'},
    '8号線（今里筋線）': {'color': '#ee7b1a', 'en': 'Imazatosuji Line'},
    '南港ポートタウン線': {'color': '#00b2b2', 'en': 'New Tram'},

    # Kyoto Municipal Subway
    '京都市営地下鉄烏丸線': {'color': '#31a354', 'en': 'Karasuma Line'},
    '烏丸線': {'color': '#31a354', 'en': 'Karasuma Line'},
    '京都市営地下鉄東西線': {'color': '#e85298', 'en': 'Tozai Line'},

    # Kobe Municipal Subway
    '西神線': {'color': '#008000', 'en': 'Seishin Line'},
    '西神延伸線': {'color': '#008000', 'en': 'Seishin Extension Line'},
    '海岸線': {'color': '#0078ba', 'en': 'Kaigan Line'},
    '北神線': {'color': '#008000', 'en': 'Hokushin Line'},

    # Hanshin Railway - Orange
    '阪神本線': {'color': '#f15a22', 'en': 'Hanshin Main Line'},
    '阪神なんば線': {'color': '#f15a22', 'en': 'Hanshin Namba Line'},
    '武庫川線': {'color': '#f15a22', 'en': 'Hanshin Mukogawa Line'},

    # Nankai Railway - Blue
    '南海本線': {'color': '#0072bc', 'en': 'Nankai Main Line'},
    '南海高野線': {'color': '#0072bc', 'en': 'Nankai Koya Line'},
    '高野線': {'color': '#0072bc', 'en': 'Nankai Koya Line'},
    '泉北高速鉄道線': {'color': '#0072bc', 'en': 'Semboku Rapid Railway'},

    # Eizan Railway - Green
    '叡山本線': {'color': '#008000', 'en': 'Eizan Main Line'},
    '鞍馬線': {'color': '#008000', 'en': 'Eizan Kurama Line'},

    # Keifuku (Randen) - Purple
    '嵐山本線': {'color': '#800080', 'en': 'Randen Arashiyama Line'},
    '北野線': {'color': '#800080', 'en': 'Randen Kitano Line'},

    # Osaka Monorail - Blue
    '大阪モノレール線': {'color': '#00a0e9', 'en': 'Osaka Monorail'},

    # Port Liner / Rokko Liner - Teal
    'ポートアイランド線': {'color': '#00b2b2', 'en': 'Port Liner'},
    '六甲アイランド線': {'color': '#00b2b2', 'en': 'Rokko Liner'},

    # Nose Electric Railway - Orange
    '妙見線': {'color': '#f15a22', 'en': 'Nose Myoken Line'},
    '日生線': {'color': '#f15a22', 'en': 'Nose Nissei Line'},

    # Kobe Electric Railway - Orange
    '有馬線': {'color': '#f15a22', 'en': 'Shintetsu Arima Line'},
    '粟生線': {'color': '#f15a22', 'en': 'Shintetsu Ao Line'},

    # Hankai Tramway - Green
    '阪堺線': {'color': '#008000', 'en': 'Hankai Line'},
    '上町線': {'color': '#008000', 'en': 'Hankai Uemachi Line'},
}

def main():
    # Combine all lines
    all_lines = {}
    all_lines.update(KANSAI_LINES)
    all_lines.update(TOKYO_LINES)

    # Add default transfer
    all_lines['transfer'] = {'color': '#999999', 'en': 'Transfer'}

    # Output JSON file
    output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'japan_line_data.json')

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_lines, f, ensure_ascii=False, indent=2)

    print(f"Generated {output_path} with {len(all_lines)} line entries")

if __name__ == '__main__':
    main()
