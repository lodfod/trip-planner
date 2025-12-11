#!/usr/bin/env python3
"""
Parse Wikipedia Ja-rail-color template to extract official Japanese rail line colors.
Source: https://en.wikipedia.org/wiki/Template:Ja-rail-color
"""

import json
import re

# Raw template data from Wikipedia (extracted from the template source)
# Format: code -> (hex_color, line_name, operator)
WIKIPEDIA_COLORS = {
    # JR Central
    'CA': ('F6861F', 'Tōkaidō Main Line', 'JR Central'),
    'CB': ('477543', 'Gotemba Line', 'JR Central'),
    'CC': ('773C97', 'Minobu Line', 'JR Central'),
    'CD': ('6FA3D7', 'Iida Line', 'JR Central'),
    'CE': ('8C5A38', 'Taketoyo Line', 'JR Central'),
    'CF': ('327198', 'Chūō Main Line', 'JR Central'),
    'CG': ('9E1813', 'Takayama Main Line', 'JR Central'),
    'CI': ('C8BA45', 'Taita Line', 'JR Central'),
    'CJ': ('16B68F', 'Kansai Main Line', 'JR Central'),

    # JR East
    'CO': ('007BBE', 'Chūō Main Line', 'JR East'),
    'JA': ('2E8B57', 'Saikyō Line', 'JR East'),
    'JB': ('FFD700', 'Chūō–Sōbu Line', 'JR East'),
    'JC': ('FF4500', 'Chūō Line (Rapid)', 'JR East'),
    'JE': ('DC143C', 'Keiyō Line', 'JR East'),
    'JH': ('9ACD32', 'Yokohama Line', 'JR East'),
    'JI': ('FFD700', 'Tsurumi Line', 'JR East'),
    'JJ': ('3CB371', 'Jōban Line', 'JR East'),
    'JK': ('00BFFF', 'Keihin-Tōhoku Line', 'JR East'),
    'JL': ('808080', 'Jōban Line (local)', 'JR East'),
    'JM': ('FF4500', 'Musashino Line', 'JR East'),
    'JN': ('FFD700', 'Nambu Line', 'JR East'),
    'JO': ('0070B9', 'Yokosuka Line', 'JR East'),
    'JS': ('FF0000', 'Shōnan-Shinjuku Line', 'JR East'),
    'JT': ('FFA500', 'Tōkaidō Main Line', 'JR East'),
    'JU': ('FFA500', 'Utsunomiya Line', 'JR East'),
    'JY': ('9ACD32', 'Yamanote Line', 'JR East'),
    'SE': ('00B3E6', "Shin'etsu Main Line", 'JR East'),
    'SN_JR': ('F15A22', 'Shinonoi Line', 'JR East'),

    # JR Hokkaido
    'HA': ('E09C42', 'Sapporo—Asahikawa—Abashiri', 'JR Hokkaido'),
    'HAP': ('0098D8', 'Chitose Line (Airport)', 'JR Hokkaido'),
    'HB': ('EB848D', 'Hakodate Line', 'JR Hokkaido'),
    'HH': ('487CBC', 'Hokkaido Line', 'JR Hokkaido'),
    'HT': ('994A95', 'Hokkaido Line', 'JR Hokkaido'),
    'HW': ('8A483B', 'Sōya Main Line', 'JR Hokkaido'),

    # JR Shikoku
    'SB': ('2a6482', 'Tokushima Line', 'JR Shikoku'),
    'SD': ('E25885', 'Dosan Line', 'JR Shikoku'),
    'SM': ('00B5A7', 'Mugi Line', 'JR Shikoku'),
    'SU': ('F9AA00', 'Uchiko Line', 'JR Shikoku'),

    # Keio Corporation
    'KO': ('E3379F', 'Keiō Line', 'Keio'),
    'IN': ('1A407B', 'Inokashira Line', 'Keio'),

    # Keisei Electric Railway
    'KS': ('005AAA', 'Keisei Main Line', 'Keisei'),

    # Odakyu Electric Railway
    'OE': ('2683CE', 'Enoshima Line', 'Odakyu'),
    'OH': ('2683CE', 'Odawara Line', 'Odakyu'),
    'OT': ('2683CE', 'Tama Line', 'Odakyu'),

    # Osaka Metro
    'MC': ('019A66', 'Chūō Line', 'Osaka Metro'),
    'MI': ('EE7B1A', 'Imazatosuji Line', 'Osaka Metro'),
    'MK': ('814721', 'Sakaisuji Line', 'Osaka Metro'),
    'MM': ('E5171F', 'Midōsuji Line', 'Osaka Metro'),
    'MN': ('A9CC51', 'Nagahori Tsurumi-ryokuchi Line', 'Osaka Metro'),
    'MP': ('00A0DE', 'Nankō Port Town Line', 'Osaka Metro'),
    'MS': ('E44D93', 'Sennichimae Line', 'Osaka Metro'),
    'MT': ('522886', 'Tanimachi Line', 'Osaka Metro'),
    'MY': ('0078BE', 'Yotsubashi Line', 'Osaka Metro'),

    # Seibu Railway
    'SI': ('ED772D', 'Ikebukuro Line', 'Seibu'),
    'SK': ('34B559', 'Kokubunji Line', 'Seibu'),
    'SS': ('00A6BF', 'Shinjuku Line', 'Seibu'),
    'ST': ('FAAA27', 'Tamako Line', 'Seibu'),
    'SW': ('ED772D', 'Tamagawa Line', 'Seibu'),
    'SY': ('EF473D', 'Yamaguchi Line', 'Seibu'),

    # Tobu Railway
    'TD': ('00BFFF', 'Noda Line', 'Tobu'),
    'TI': ('DC143C', 'Isesaki Line', 'Tobu'),
    'TJ': ('004098', 'Tōjō Line', 'Tobu'),
    'TN': ('FFA500', 'Nikkō Line', 'Tobu'),
    'TS': ('005AAA', 'Skytree Line', 'Tobu'),

    # Toei Subway
    'A': ('EC6E65', 'Asakusa Line', 'Toei'),
    'E': ('CE045B', 'Ōedo Line', 'Toei'),
    'I': ('006CB6', 'Mita Line', 'Toei'),
    'S': ('B0C124', 'Shinjuku Line', 'Toei'),

    # Tokyo Metro
    'C': ('00BB85', 'Chiyoda Line', 'Tokyo Metro'),
    'F': ('9C5E31', 'Fukutoshin Line', 'Tokyo Metro'),
    'G': ('FF9500', 'Ginza Line', 'Tokyo Metro'),
    'H': ('B5B5AC', 'Hibiya Line', 'Tokyo Metro'),
    'M': ('F62E36', 'Marunouchi Line', 'Tokyo Metro'),
    'N': ('00AC9B', 'Namboku Line', 'Tokyo Metro'),
    'T': ('009BBF', 'Tozai Line', 'Tokyo Metro'),
    'Y': ('C1A470', 'Yūrakuchō Line', 'Tokyo Metro'),
    'Z': ('8F76D6', 'Hanzōmon Line', 'Tokyo Metro'),

    # Tokyu Corporation
    'DT': ('20A288', 'Den-en-Toshi Line', 'Tokyu'),
    'IK': ('EE86A7', 'Ikegami Line', 'Tokyu'),
    'KD': ('0068B7', 'Kodomonokuni Line', 'Tokyu'),
    'MG': ('009CD2', 'Meguro Line', 'Tokyu'),
    'OM': ('F18C43', 'Oimachi Line', 'Tokyu'),
    'SG': ('FCC70D', 'Setagaya Line', 'Tokyu'),
    'SH': ('890d84', 'Shin-Yokohama Line', 'Tokyu'),
    'TM': ('AE0378', 'Tamagawa Line', 'Tokyu'),
    'TY': ('DA0442', 'Toyoko Line', 'Tokyu'),

    # Other
    'HK': ('34B580', 'Hankyu Railway', 'Hankyu'),
    'HS': ('00BFFF', 'Hokusō Line', 'Hokuso'),
    'KK': ('32CAE2', 'Keikyu Line', 'Keikyu'),
    'SR': ('345CAA', 'Saitama Rapid Railway', 'Saitama'),
    'SL': ('FF69B4', 'Shin-Keisei Line', 'Shin-Keisei'),
    'MO': ('000080', 'Tokyo Monorail', 'Tokyo Monorail'),
    'TR': ('0AAA3C', 'Tōyō Rapid Railway', 'Toyo Rapid'),
    'U': ('0065A6', 'Yurikamome', 'Yurikamome'),
    'WK': ('6D0023', 'Watarase Keikoku Line', 'Watarase'),
    'TX': ('000084', 'Tsukuba Express', 'Tsukuba Express'),
}

# Map Japanese line names (as they appear in MLIT data) to Wikipedia color codes
# This is the key mapping that connects MLIT GIS data to Wikipedia colors
JAPANESE_TO_WIKI = {
    # Tokyo Metro (numbered lines in MLIT data)
    '銀座線': 'G',
    '1号線銀座線': 'G',
    '3号線銀座線': 'G',
    '3号線': 'G',
    '日比谷線': 'H',
    '2号線日比谷線': 'H',
    '丸ノ内線': 'M',
    '4号線丸ノ内線': 'M',
    '4号線': 'M',
    '4号線丸ノ内線分岐線': 'M',
    '東西線': 'T',
    '5号線東西線': 'T',
    '千代田線': 'C',
    '9号線千代田線': 'C',
    '有楽町線': 'Y',
    '8号線有楽町線': 'Y',
    '半蔵門線': 'Z',
    '11号線半蔵門線': 'Z',
    '南北線': 'N',
    '7号線南北線': 'N',
    '副都心線': 'F',
    '13号線副都心線': 'F',

    # Toei Subway
    '浅草線': 'A',
    '1号線浅草線': 'A',
    '三田線': 'I',
    '6号線三田線': 'I',
    '新宿線': 'S',
    '10号線新宿線': 'S',
    '大江戸線': 'E',
    '12号線大江戸線': 'E',

    # JR East
    '山手線': 'JY',
    '中央線': 'JC',
    '中央線快速': 'JC',
    '中央・総武線': 'JB',
    '総武線': 'JB',
    '総武本線': 'JB',
    '京浜東北線': 'JK',
    '横須賀線': 'JO',
    '埼京線': 'JA',
    '赤羽線（埼京線）': 'JA',
    '東北線（埼京線）': 'JA',
    '常磐線': 'JJ',
    '常磐線快速': 'JJ',
    '京葉線': 'JE',
    '武蔵野線': 'JM',
    '南武線': 'JN',
    '横浜線': 'JH',
    '鶴見線': 'JI',
    '東海道線': 'JT',

    # Tokyu
    '東横線': 'TY',
    '東急東横線': 'TY',
    '田園都市線': 'DT',
    '東急田園都市線': 'DT',
    '目黒線': 'MG',
    '東急目黒線': 'MG',
    '大井町線': 'OM',
    '東急大井町線': 'OM',
    '池上線': 'IK',
    '東急池上線': 'IK',
    '多摩川線': 'TM',
    '東急多摩川線': 'TM',
    '世田谷線': 'SG',
    'こどもの国線': 'KD',

    # Odakyu
    '小田急線': 'OH',
    '小田原線': 'OH',
    '小田急小田原線': 'OH',
    '江ノ島線': 'OE',
    '小田急江ノ島線': 'OE',
    '多摩線': 'OT',
    '小田急多摩線': 'OT',

    # Keio
    '京王線': 'KO',
    '井の頭線': 'IN',
    '京王井の頭線': 'IN',
    '相模原線': 'KO',
    '動物園線': 'KO',
    '競馬場線': 'KO',

    # Seibu
    '池袋線': 'SI',
    '西武池袋線': 'SI',
    '西武新宿線': 'SS',
    '拝島線': 'SI',
    '多摩湖線': 'ST',
    '国分寺線': 'SK',
    '西武園線': 'SI',
    '西武有楽町線': 'SI',
    '狭山線': 'SI',
    '豊島線': 'SI',
    '山口線': 'SY',

    # Tobu
    '東上本線': 'TJ',
    '東武東上線': 'TJ',
    '伊勢崎線': 'TI',
    '東武伊勢崎線': 'TI',
    '東武スカイツリーライン': 'TS',
    '亀戸線': 'TI',
    '大師線': 'TI',
    '野田線': 'TD',

    # Keisei
    '本線': 'KS',
    '京成本線': 'KS',
    '押上線': 'KS',
    '京成押上線': 'KS',
    '金町線': 'KS',
    '成田空港線': 'KS',

    # Keikyu
    '空港線': 'KK',
    '京急本線': 'KK',
    '京急線': 'KK',

    # Other Tokyo
    'りんかい線': 'HS',  # Using Hokuso color as placeholder
    '東京臨海新交通臨海線': 'U',
    'ゆりかもめ': 'U',
    '東京モノレール羽田線': 'MO',
    '東京モノレール': 'MO',
    '日暮里・舎人線': 'SL',
    '日暮里・舎人ライナー': 'SL',
    '埼玉高速鉄道線': 'SR',
    '北総線': 'HS',
    '東葉高速線': 'TR',
    '新京成線': 'SL',
    'つくばエクスプレス': 'TX',
    '常磐新線': 'TX',

    # Osaka Metro
    '御堂筋線': 'MM',
    '大阪市高速電気軌道御堂筋線': 'MM',
    '1号線(御堂筋線)': 'MM',
    '谷町線': 'MT',
    '大阪市高速電気軌道谷町線': 'MT',
    '2号線(谷町線)': 'MT',
    '四つ橋線': 'MY',
    '大阪市高速電気軌道四つ橋線': 'MY',
    '3号線(四つ橋線)': 'MY',
    '中央線': 'MC',
    '大阪市高速電気軌道中央線': 'MC',
    '4号線(中央線)': 'MC',
    '千日前線': 'MS',
    '大阪市高速電気軌道千日前線': 'MS',
    '5号線(千日前線)': 'MS',
    '堺筋線': 'MK',
    '大阪市高速電気軌道堺筋線': 'MK',
    '6号線(堺筋線)': 'MK',
    '長堀鶴見緑地線': 'MN',
    '大阪市高速電気軌道長堀鶴見緑地線': 'MN',
    '7号線(長堀鶴見緑地線)': 'MN',
    '今里筋線': 'MI',
    '大阪市高速電気軌道今里筋線': 'MI',
    '8号線（今里筋線）': 'MI',
    '南港ポートタウン線': 'MP',

    # Hankyu (all lines use same maroon color)
    '阪急京都本線': 'HK',
    '阪急京都線': 'HK',
    '京都線': 'HK',
    '阪急神戸本線': 'HK',
    '阪急神戸線': 'HK',
    '神戸線': 'HK',
    '阪急宝塚本線': 'HK',
    '阪急宝塚線': 'HK',
    '宝塚線': 'HK',
    '阪急千里線': 'HK',
    '千里線': 'HK',
    '阪急嵐山線': 'HK',
    '嵐山線': 'HK',
    '今津線': 'HK',
    '伊丹線': 'HK',
    '甲陽線': 'HK',
    '箕面線': 'HK',
    '神戸高速線': 'HK',
}

# Additional colors not in Wikipedia template (Kansai specific)
ADDITIONAL_COLORS = {
    # JR West (blue)
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
    '山陽新幹線': '#0072bc',
    '山陽線': '#0072bc',
    '福知山線': '#ffd400',
    '片町線': '#ff69b4',
    '桜島線': '#e60012',
    'おおさか東線': '#9acd32',
    '東海道新幹線': '#0072bc',
    '東北新幹線': '#00b261',

    # Keihan (green)
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

    # Kintetsu (red)
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

    # Kyoto Municipal Subway
    '京都市営地下鉄烏丸線': '#31a354',
    '烏丸線': '#31a354',
    '京都市営地下鉄東西線': '#e85298',

    # Kobe Municipal Subway
    '西神線': '#008000',
    '西神延伸線': '#008000',
    '海岸線': '#0078ba',
    '北神線': '#008000',

    # Hanshin (orange)
    '阪神本線': '#f15a22',
    '阪神なんば線': '#f15a22',
    '武庫川線': '#f15a22',

    # Nankai (blue)
    '南海本線': '#0072bc',
    '南海高野線': '#0072bc',
    '高野線': '#0072bc',
    '泉北高速鉄道線': '#0072bc',

    # Eizan (green)
    '叡山本線': '#008000',
    '鞍馬線': '#008000',

    # Keifuku/Randen (purple)
    '嵐山本線': '#800080',
    '北野線': '#800080',

    # Osaka Monorail
    '大阪モノレール線': '#00a0e9',
    '多摩都市モノレール線': '#f39800',
    '多摩モノレール': '#f39800',

    # Port Liner / Rokko Liner
    'ポートアイランド線': '#00b2b2',
    '六甲アイランド線': '#00b2b2',

    # Misc
    '阪堺線': '#008000',
    '上町線': '#008000',
    '妙見線': '#f15a22',
    '日生線': '#f15a22',
    '有馬線': '#f15a22',
    '粟生線': '#f15a22',
    '流山線': '#00a650',
    '荒川線': '#ffc20e',
    'ディズニーリゾートライン': '#e7348e',
    '上野懸垂線': '#228b22',

    # Default for transfers
    'transfer': '#999999',
}


def generate_line_data():
    """Generate comprehensive line color/translation data."""
    output = {}

    # First, add Wikipedia-sourced colors via the mapping
    for ja_name, wiki_code in JAPANESE_TO_WIKI.items():
        if wiki_code in WIKIPEDIA_COLORS:
            hex_color, en_name, operator = WIKIPEDIA_COLORS[wiki_code]
            output[ja_name] = {
                'color': f'#{hex_color}',
                'en': en_name,
                'operator': operator,
                'source': 'wikipedia'
            }

    # Then add/override with additional Kansai colors
    for ja_name, color in ADDITIONAL_COLORS.items():
        if ja_name not in output:
            output[ja_name] = {
                'color': color,
                'en': ja_name,  # Will need translation
                'source': 'manual'
            }
        else:
            # Keep the color from additional if it's more specific
            pass

    return output


def main():
    import os

    line_data = generate_line_data()

    output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'japan_line_colors.json')

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(line_data, f, ensure_ascii=False, indent=2)

    print(f"Generated {output_path} with {len(line_data)} line entries")

    # Also print summary
    wiki_count = sum(1 for v in line_data.values() if v.get('source') == 'wikipedia')
    manual_count = sum(1 for v in line_data.values() if v.get('source') == 'manual')
    print(f"  - From Wikipedia: {wiki_count}")
    print(f"  - Manual additions: {manual_count}")


if __name__ == '__main__':
    main()
