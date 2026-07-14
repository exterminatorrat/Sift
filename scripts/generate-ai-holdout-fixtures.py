"""Generate the deterministic 48-image Sift candidate holdout corpus.

The images are controlled synthetic repository fixtures. Each of the 24
underlying menus owns two visual/profile cases, and both cases remain in the
same split. Run with --write to generate files and --check to verify exact,
byte-for-byte output.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import random
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = "scripts/generate-ai-holdout-fixtures.py"
HOLDOUT_DIR = ROOT / "docs" / "ai-evals" / "images" / "holdout"
SOURCE_MANIFEST_PATH = HOLDOUT_DIR / "source-cases.json"
TRANSLATION_SCENARIO_SLUGS = {
    "traditional-chinese-dim-sum",
    "vietnamese-street-grill",
    "turkish-lokanta-baklava",
    "polish-milk-bar",
    "indonesian-warung-terasi",
    "dutch-canal-bistro",
}
DEVELOPMENT_MANIFEST_PATH = ROOT / "docs" / "ai-evals" / "benchmark-v1" / "development-v1.json"
IMAGE_WIDTH = 1200
IMAGE_HEIGHT = 1600
JPEG_QUALITY = 90
CASE_START = 101
EXPECTED_GROUP_COUNT = 24
EXPECTED_CASE_COUNT = 48
CASES_PER_GROUP = 2

EXPECTED_LANGUAGES = (
    "Traditional Chinese",
    "Vietnamese",
    "Turkish",
    "Polish",
    "Indonesian",
    "Dutch",
)

FONT_PATHS = {
    "Traditional Chinese": Path(r"C:\Windows\Fonts\msjh.ttc"),
    "default": Path(r"C:\Windows\Fonts\segoeui.ttf"),
    "bold": Path(r"C:\Windows\Fonts\segoeuib.ttf"),
}

def direct_dish(name: str, description: str, evidence_note: str) -> dict[str, str]:
    return {
        "name": name,
        "description": description,
        "role": "risk_target",
        "evidenceLabel": "confirmed_visible",
        "evidenceNote": evidence_note,
        "riskKind": "direct",
    }


def pattern_dish(name: str, description: str, evidence_note: str) -> dict[str, str]:
    return {
        "name": name,
        "description": description,
        "role": "risk_target",
        "evidenceLabel": "plausible_pattern",
        "evidenceNote": evidence_note,
        "riskKind": "pattern",
    }


def benign_dish(name: str, description: str, evidence_note: str) -> dict[str, str]:
    return {
        "name": name,
        "description": description,
        "role": "benign_control",
        "evidenceLabel": "unknown_unobservable",
        "evidenceNote": evidence_note,
        "riskKind": "benign",
    }


SCENARIOS: list[dict[str, Any]] = [
    {
        "slug": "traditional-chinese-dim-sum",
        "language": "Traditional Chinese",
        "cuisine": "Cantonese dim sum",
        "title": "海棠點心坊",
        "menuLabel": "精選菜單",
        "footer": "食材與製作方式可能更改，請向店員確認。",
        "allergies": ["Shellfish", "Wheat/gluten"],
        "variantKeys": ["clear_counter", "angled_photo"],
        "dishes": [
            direct_dish(
                "鮮蝦餃",
                "鮮蝦、小麥澱粉皮、芝麻油",
                "Shrimp and a wheat-starch wrapper are directly named in visible text.",
            ),
            pattern_dish(
                "蠔油炒時蔬",
                "時蔬、蠔油、主廚調味汁",
                "Oyster sauce is visible, but its exact shellfish derivative and the chef seasoning require confirmation.",
            ),
            benign_dish(
                "清蒸白飯",
                "白米、水",
                "The visible ingredients are simple, but completeness and shared handling remain unobservable.",
            ),
        ],
    },
    {
        "slug": "traditional-chinese-night-market",
        "language": "Traditional Chinese",
        "cuisine": "Taiwanese night-market",
        "title": "南門夜市小館",
        "menuLabel": "夜市小吃",
        "footer": "配方與攤位備料可能調整，過敏需求請先詢問。",
        "allergies": ["Peanut", "Soy"],
        "variantKeys": ["glare_fold", "blurred_crop"],
        "dishes": [
            direct_dish(
                "花生粉潤餅",
                "花生粉、豆干、高麗菜、薄餅皮",
                "Peanut powder and soy-based dried tofu are directly named in the description.",
            ),
            pattern_dish(
                "招牌滷味",
                "時蔬與米血、每日調製滷汁",
                "The daily braising liquid is unspecified and may contain soy or peanut-derived seasoning.",
            ),
            benign_dish(
                "炭烤地瓜",
                "地瓜",
                "No profile allergen is visible, but shared utensils and added seasoning cannot be verified.",
            ),
        ],
    },
    {
        "slug": "traditional-chinese-harbor-congee",
        "language": "Traditional Chinese",
        "cuisine": "Hong Kong congee",
        "title": "港灣粥舖",
        "menuLabel": "暖粥與小菜",
        "footer": "海鮮與醬料依當日供應，請向服務人員確認。",
        "allergies": ["Fish", "Shellfish"],
        "variantKeys": ["clear_counter", "blurred_crop"],
        "dishes": [
            direct_dish(
                "港式海鮮粥",
                "魚片、鮮蝦、白米、薑絲",
                "Fish and shrimp are directly named in readable menu text.",
            ),
            pattern_dish(
                "XO醬蘿蔔糕",
                "蘿蔔糕、自製XO醬、青蔥",
                "The house XO sauce recipe is not listed and may use dried fish or shellfish.",
            ),
            benign_dish(
                "蒜香燙青菜",
                "青江菜、蒜",
                "The listed ingredients omit profile allergens, while sauce additions and cross-contact remain unknown.",
            ),
        ],
    },
    {
        "slug": "traditional-chinese-teahouse",
        "language": "Traditional Chinese",
        "cuisine": "Taiwanese teahouse",
        "title": "青禾茶館",
        "menuLabel": "茶點",
        "footer": "自製餡料與沾醬可能更換，請先告知過敏需求。",
        "allergies": ["Sesame", "Tree nuts"],
        "variantKeys": ["angled_photo", "glare_fold"],
        "dishes": [
            direct_dish(
                "芝麻核桃糊",
                "黑芝麻、核桃、米漿",
                "Black sesame and walnut are directly named in the dish description.",
            ),
            pattern_dish(
                "招牌素餃",
                "高麗菜、香菇、自製沾醬",
                "The house dipping sauce is unspecified and could contain sesame or ground nuts.",
            ),
            benign_dish(
                "桂花茶凍",
                "茶、桂花、糖",
                "No profile allergen is visible, but the full preparation environment is unobservable.",
            ),
        ],
    },
    {
        "slug": "vietnamese-street-grill",
        "language": "Vietnamese",
        "cuisine": "Northern Vietnamese",
        "title": "Bếp Phố Nhỏ",
        "menuLabel": "THỰC ĐƠN",
        "footer": "Nguyên liệu và cách chế biến có thể thay đổi. Vui lòng hỏi nhân viên.",
        "allergies": ["Fish", "Peanut"],
        "variantKeys": ["clear_counter", "angled_photo"],
        "dishes": [
            direct_dish(
                "Bún Chả Hà Nội",
                "Thịt nướng, bún, rau thơm, nước mắm",
                "Fish sauce is directly named and is relevant to the fish allergy.",
            ),
            pattern_dish(
                "Gỏi Cuốn Nhà Làm",
                "Rau, bún, bánh tráng; dùng với sốt nhà làm",
                "The house dipping sauce is unspecified and may contain peanut ingredients.",
            ),
            benign_dish(
                "Trái Cây Tươi",
                "Thanh long, dứa, dâu",
                "No profile allergen is visible, but shared preparation remains unobservable.",
            ),
        ],
    },
    {
        "slug": "vietnamese-hue-rice-kitchen",
        "language": "Vietnamese",
        "cuisine": "Central Vietnamese",
        "title": "Bếp Huế Ven Sông",
        "menuLabel": "MÓN HUẾ",
        "footer": "Nước sốt và gia vị được làm theo mẻ. Hãy xác nhận với nhân viên.",
        "allergies": ["Shellfish", "Soy"],
        "variantKeys": ["glare_fold", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Cơm Hến",
                "Hến, mắm ruốc, cơm, rau thơm",
                "Clams and shrimp paste are directly named in the visible description.",
            ),
            pattern_dish(
                "Gà Nướng Sả",
                "Gà, sả, nước ướp của quán",
                "The restaurant marinade is not described and may include soy-based seasoning.",
            ),
            benign_dish(
                "Cơm Trắng",
                "Gạo hấp",
                "The menu lists only steamed rice, while shared serving equipment cannot be assessed.",
            ),
        ],
    },
    {
        "slug": "vietnamese-bakery-cafe",
        "language": "Vietnamese",
        "cuisine": "Vietnamese bakery cafe",
        "title": "Tiệm Bánh Ban Mai",
        "menuLabel": "BÁNH & CÀ PHÊ",
        "footer": "Công thức bột và kem có thể đổi theo ngày. Vui lòng hỏi trước khi gọi món.",
        "allergies": ["Wheat/gluten", "Egg", "Dairy"],
        "variantKeys": ["clear_counter", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Bánh Mì Trứng",
                "Bánh mì, trứng, bơ",
                "Bread, egg, and butter are directly named in readable text.",
            ),
            pattern_dish(
                "Cà Phê Kem Muối",
                "Cà phê, lớp kem công thức riêng",
                "The proprietary cream recipe leaves its dairy and egg content unconfirmed.",
            ),
            benign_dish(
                "Trà Đá Chanh",
                "Trà, chanh, đá",
                "No profile allergen is listed, but preparation completeness cannot be established.",
            ),
        ],
    },
    {
        "slug": "vietnamese-vegetarian-pagoda",
        "language": "Vietnamese",
        "cuisine": "Vietnamese Buddhist vegetarian",
        "title": "Quán Chay Lá Bồ Đề",
        "menuLabel": "MÓN CHAY",
        "footer": "Gia vị chay và nước dùng được chuẩn bị chung. Hãy hỏi nhân viên.",
        "allergies": ["Peanut", "Sesame", "Soy"],
        "variantKeys": ["angled_photo", "glare_fold"],
        "dishes": [
            direct_dish(
                "Bún Đậu Sốt Lạc",
                "Đậu hũ, bún, sốt lạc, mè",
                "Tofu, peanut sauce, and sesame are directly named in visible text.",
            ),
            pattern_dish(
                "Phở Nấm",
                "Nấm, bánh phở, nước dùng chay bí mật",
                "The secret vegetarian broth may use soy or sesame seasoning and needs confirmation.",
            ),
            benign_dish(
                "Đu Đủ Tươi",
                "Đu đủ chín",
                "The visible item is plain fruit, but shared cutting surfaces are unobservable.",
            ),
        ],
    },
    {
        "slug": "turkish-lokanta-baklava",
        "language": "Turkish",
        "cuisine": "Turkish lokanta",
        "title": "Sahil Lokantası",
        "menuLabel": "MENÜ",
        "footer": "Malzemeler ve hazırlama yöntemi değişebilir. Lütfen personele sorunuz.",
        "allergies": ["Tree nuts", "Dairy"],
        "variantKeys": ["clear_counter", "angled_photo"],
        "dishes": [
            direct_dish(
                "Fıstıklı Baklava",
                "Antep fıstığı, tereyağı ve şerbet",
                "Pistachio and butter are directly named in visible text.",
            ),
            pattern_dish(
                "Tavuk Şiş",
                "Ev yapımı marine sosu ile ızgara tavuk",
                "The house marinade is unspecified and may contain dairy or ground nuts.",
            ),
            benign_dish(
                "Çoban Salatası",
                "Domates, salatalık, maydanoz, limon",
                "The listed ingredients look simple, but shared preparation is unobservable.",
            ),
        ],
    },
    {
        "slug": "turkish-anatolian-pide",
        "language": "Turkish",
        "cuisine": "Anatolian pide",
        "title": "Anadolu Taş Fırını",
        "menuLabel": "PİDELER",
        "footer": "Hamur ve marineler günlük hazırlanır. Alerjenler için personele danışın.",
        "allergies": ["Wheat/gluten", "Dairy"],
        "variantKeys": ["glare_fold", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Peynirli Pide",
                "Buğday hamuru, beyaz peynir, kaşar",
                "Wheat dough and two cheeses are directly named in the description.",
            ),
            pattern_dish(
                "Fırın Tavuk",
                "Tavuk, sebze, ustanın günlük sosu",
                "The daily chef sauce may use yogurt or a wheat-derived thickener.",
            ),
            benign_dish(
                "Sumaklı Soğan",
                "Soğan, sumak, maydanoz",
                "No profile allergen is visible, but preparation surfaces are not described.",
            ),
        ],
    },
    {
        "slug": "turkish-aegean-meze",
        "language": "Turkish",
        "cuisine": "Aegean Turkish meze",
        "title": "Ege Meze Evi",
        "menuLabel": "SOĞUK MEZELER",
        "footer": "Mezeler küçük partilerde hazırlanır. İçeriği servis ekibine doğrulatın.",
        "allergies": ["Sesame", "Tree nuts"],
        "variantKeys": ["clear_counter", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Tahinli Humus",
                "Nohut, tahin, susam, limon",
                "Tahini and sesame are directly named in visible menu text.",
            ),
            pattern_dish(
                "Köz Patlıcan Ezmesi",
                "Patlıcan, otlar, günlük meze sosu",
                "The daily meze sauce and garnish may contain sesame or tree nuts.",
            ),
            benign_dish(
                "Zeytin Tabağı",
                "Yeşil ve siyah zeytin",
                "The visible ingredients omit profile allergens, while shared utensils remain unknown.",
            ),
        ],
    },
    {
        "slug": "turkish-black-sea-cafe",
        "language": "Turkish",
        "cuisine": "Black Sea Turkish",
        "title": "Karadeniz Sofrası",
        "menuLabel": "YÖRESEL TATLAR",
        "footer": "Balık ve fırın ürünlerinin tarifi mevsime göre değişebilir.",
        "allergies": ["Fish", "Dairy"],
        "variantKeys": ["angled_photo", "glare_fold"],
        "dishes": [
            direct_dish(
                "Hamsili Pilav",
                "Hamsi, pirinç, soğan, dereotu",
                "Anchovy is directly named in the dish and description.",
            ),
            pattern_dish(
                "Mısır Ekmeği",
                "Günlük tarifle fırınlanan mısır ekmeği",
                "The daily cornbread recipe does not disclose whether milk or butter is used.",
            ),
            benign_dish(
                "Fasulye Salatası",
                "Fasulye, soğan, maydanoz, limon",
                "No profile allergen is visible, but recipe completeness cannot be confirmed.",
            ),
        ],
    },
    {
        "slug": "polish-milk-bar",
        "language": "Polish",
        "cuisine": "Polish milk bar",
        "title": "Bar Mleczny Zielony",
        "menuLabel": "MENU DNIA",
        "footer": "Składniki i sposób przygotowania mogą się zmienić. Zapytaj obsługę.",
        "allergies": ["Egg", "Dairy"],
        "variantKeys": ["clear_counter", "angled_photo"],
        "dishes": [
            direct_dish(
                "Jajecznica ze Śmietaną",
                "Jajka, śmietana, masło i szczypiorek",
                "Eggs, cream, and butter are directly named in the description.",
            ),
            pattern_dish(
                "Sałatka Domowa",
                "Warzywa sezonowe z sosem szefa kuchni",
                "The chef dressing is unspecified and could contain egg or dairy.",
            ),
            benign_dish(
                "Ziemniaki Gotowane",
                "Ziemniaki, sól, świeży koperek",
                "No profile allergen is visible, but unlisted additions remain unobservable.",
            ),
        ],
    },
    {
        "slug": "polish-pierogi-kitchen",
        "language": "Polish",
        "cuisine": "Polish pierogi",
        "title": "Pierogarnia Pod Lipą",
        "menuLabel": "PIEROGI I ZUPY",
        "footer": "Ciasto, farsz i dodatki są robione na miejscu. Potwierdź składniki.",
        "allergies": ["Wheat/gluten", "Dairy"],
        "variantKeys": ["glare_fold", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Pierogi Ruskie",
                "Mąka pszenna, twaróg, ziemniaki, masło",
                "Wheat flour, curd cheese, and butter are directly named.",
            ),
            pattern_dish(
                "Zupa Dnia",
                "Warzywa i dodatki według przepisu kucharza",
                "The chef recipe may add cream or a wheat thickener and needs confirmation.",
            ),
            benign_dish(
                "Buraczki Gotowane",
                "Buraki, sól, koperek",
                "The listed ingredients omit profile allergens, but kitchen handling is unknown.",
            ),
        ],
    },
    {
        "slug": "polish-baltic-cafe",
        "language": "Polish",
        "cuisine": "Polish Baltic",
        "title": "Kawiarnia Bałtycka",
        "menuLabel": "DANIA CHŁODNE",
        "footer": "Sosy przygotowujemy codziennie. Zapytaj o aktualną recepturę.",
        "allergies": ["Fish", "Mustard"],
        "variantKeys": ["clear_counter", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Śledź w Sosie Musztardowym",
                "Śledź, musztarda, cebula",
                "Herring and mustard are directly named in visible text.",
            ),
            pattern_dish(
                "Sałatka Ziemniaczana",
                "Ziemniaki, ogórek, sos domowy",
                "The house dressing is unspecified and may contain mustard or fish seasoning.",
            ),
            benign_dish(
                "Surówka z Buraków",
                "Buraki, jabłko, sok z cytryny",
                "No profile allergen is visible, but shared preparation cannot be ruled out.",
            ),
        ],
    },
    {
        "slug": "polish-bakery",
        "language": "Polish",
        "cuisine": "Polish bakery",
        "title": "Cukiernia Stary Rynek",
        "menuLabel": "WYPIEKI",
        "footer": "Receptury wypieków mogą się zmieniać. Poproś o listę alergenów.",
        "allergies": ["Tree nuts", "Egg"],
        "variantKeys": ["angled_photo", "glare_fold"],
        "dishes": [
            direct_dish(
                "Makowiec z Orzechami",
                "Orzechy włoskie, jajka, mak",
                "Walnuts and eggs are directly named in the visible description.",
            ),
            pattern_dish(
                "Pączek z Nadzieniem",
                "Ciasto i lukier według receptury cukierni",
                "The bakery recipe does not disclose egg or nut ingredients.",
            ),
            benign_dish(
                "Kompot Jabłkowy",
                "Jabłka, woda, cukier",
                "No profile allergen is listed, while preparation completeness remains unknown.",
            ),
        ],
    },
    {
        "slug": "indonesian-warung-terasi",
        "language": "Indonesian",
        "cuisine": "Indonesian warung",
        "title": "Warung Padi",
        "menuLabel": "DAFTAR MENU",
        "footer": "Bahan dan cara persiapan dapat berubah. Silakan tanya staf.",
        "allergies": ["Peanut", "Shellfish", "Soy"],
        "variantKeys": ["clear_counter", "angled_photo"],
        "dishes": [
            direct_dish(
                "Gado-Gado",
                "Sayuran, tahu, telur, saus kacang",
                "Peanut sauce and tofu are directly visible, supporting peanut and soy concerns.",
            ),
            pattern_dish(
                "Nasi Goreng Kampung",
                "Nasi, kecap, terasi, bumbu rahasia",
                "Soy sauce and terasi are visible, while the secret seasoning leaves exact content uncertain.",
            ),
            benign_dish(
                "Nasi Putih",
                "Nasi putih kukus",
                "The description is simple, but shared serving equipment is unobservable.",
            ),
        ],
    },
    {
        "slug": "indonesian-padang-house",
        "language": "Indonesian",
        "cuisine": "Minangkabau",
        "title": "Rumah Makan Minang",
        "menuLabel": "MASAKAN PADANG",
        "footer": "Bumbu dibuat dalam kelompok harian. Konfirmasikan semua kacang dengan staf.",
        "allergies": ["Peanut", "Tree nuts"],
        "variantKeys": ["glare_fold", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Sate Kacang Mete",
                "Ayam, kacang tanah, kacang mete",
                "Peanut and cashew are directly named in the visible description.",
            ),
            pattern_dish(
                "Rendang Rumah",
                "Daging sapi, santan, pasta bumbu rumah",
                "The house spice paste is unspecified and may contain candlenut or peanut.",
            ),
            benign_dish(
                "Singkong Kukus",
                "Singkong kukus, garam",
                "No profile allergen is visible, but shared preparation remains unknown.",
            ),
        ],
    },
    {
        "slug": "indonesian-seafood-grill",
        "language": "Indonesian",
        "cuisine": "Indonesian coastal seafood",
        "title": "Panggangan Teluk",
        "menuLabel": "IKAN & LAUT",
        "footer": "Sambal dan alat panggang digunakan untuk beberapa hidangan. Tanyakan kepada staf.",
        "allergies": ["Fish", "Shellfish"],
        "variantKeys": ["clear_counter", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Ikan dan Udang Bakar",
                "Ikan laut, udang, jeruk nipis",
                "Fish and shrimp are directly named in the menu description.",
            ),
            pattern_dish(
                "Nasi Sambal Rumah",
                "Nasi, sayur, sambal racikan sendiri",
                "The house sambal recipe may use terasi or fish sauce and requires confirmation.",
            ),
            benign_dish(
                "Timun Dingin",
                "Timun, es, jeruk nipis",
                "No profile allergen is visible, though shared knives and surfaces are unobservable.",
            ),
        ],
    },
    {
        "slug": "indonesian-bakery-cafe",
        "language": "Indonesian",
        "cuisine": "Indonesian bakery cafe",
        "title": "Kedai Roti Melati",
        "menuLabel": "ROTI & KUE",
        "footer": "Adonan dibuat segar dan resep dapat berubah. Mohon cek alergen.",
        "allergies": ["Wheat/gluten", "Egg", "Dairy"],
        "variantKeys": ["angled_photo", "glare_fold"],
        "dishes": [
            direct_dish(
                "Martabak Manis",
                "Tepung terigu, telur, susu, mentega",
                "Wheat flour, egg, milk, and butter are directly named.",
            ),
            pattern_dish(
                "Bolu Pandan",
                "Adonan pandan resep toko",
                "The shop batter recipe leaves its egg and dairy ingredients unspecified.",
            ),
            benign_dish(
                "Pepaya Segar",
                "Pepaya matang",
                "The visible item is plain fruit, but shared cutting surfaces remain unknown.",
            ),
        ],
    },
    {
        "slug": "dutch-canal-bistro",
        "language": "Dutch",
        "cuisine": "Dutch bistro",
        "title": "Bistro Aan de Gracht",
        "menuLabel": "AVONDMENU",
        "footer": "Ingrediënten en bereiding kunnen wijzigen. Vraag het personeel.",
        "allergies": ["Mustard", "Sulfites"],
        "variantKeys": ["clear_counter", "angled_photo"],
        "dishes": [
            direct_dish(
                "Mosterdsoep",
                "Groningse mosterd, room en kruiden",
                "Mustard is directly named in the dish name and description.",
            ),
            pattern_dish(
                "Runderstoof",
                "Rundvlees in rodewijnsaus, huisbereiding",
                "Red-wine sauce may contain sulfites, but the exact wine and preparation are not confirmed.",
            ),
            benign_dish(
                "Gestoomde Groenten",
                "Wortel, broccoli en courgette",
                "No profile allergen is visible, but seasoning and cross-contact cannot be verified.",
            ),
        ],
    },
    {
        "slug": "dutch-pancake-house",
        "language": "Dutch",
        "cuisine": "Dutch pancake house",
        "title": "Pannenkoekenhuis De Molen",
        "menuLabel": "PANNENKOEKEN",
        "footer": "Beslag en vullingen worden dagelijks gemaakt. Controleer allergenen bij de bediening.",
        "allergies": ["Wheat/gluten", "Egg", "Dairy"],
        "variantKeys": ["glare_fold", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Pannenkoek Naturel",
                "Tarwebloem, ei, melk, boter",
                "Wheat flour, egg, milk, and butter are directly named.",
            ),
            pattern_dish(
                "Huisgemaakte Kroket",
                "Ragout en paneerlaag volgens eigen recept",
                "The house ragout and breading recipe leaves wheat, egg, and dairy details uncertain.",
            ),
            benign_dish(
                "Vers Fruit",
                "Appel, peer en druiven",
                "No profile allergen is listed, but shared preparation remains unobservable.",
            ),
        ],
    },
    {
        "slug": "dutch-fish-stall",
        "language": "Dutch",
        "cuisine": "Dutch seafood",
        "title": "Viskraam Noordzee",
        "menuLabel": "VIS & FRIET",
        "footer": "Beslag, sauzen en frituurolie kunnen gedeeld worden. Vraag het personeel.",
        "allergies": ["Fish", "Egg"],
        "variantKeys": ["clear_counter", "blurred_crop"],
        "dishes": [
            direct_dish(
                "Kibbeling met Remoulade",
                "Kabeljauw, beslag, remoulade met ei",
                "Cod and egg remoulade are directly named in visible text.",
            ),
            pattern_dish(
                "Friet met Huissaus",
                "Aardappel, saus van de chef",
                "The chef sauce recipe may contain egg, and fryer handling needs confirmation.",
            ),
            benign_dish(
                "Augurk en Ui",
                "Augurk, rauwe ui",
                "No profile allergen is visible, while shared utensils remain unknown.",
            ),
        ],
    },
    {
        "slug": "dutch-market-bakery",
        "language": "Dutch",
        "cuisine": "Dutch bakery",
        "title": "Bakkerij Op de Markt",
        "menuLabel": "GEBAK & IJS",
        "footer": "Familierecepten en garneringen kunnen wisselen. Vraag naar de actuele ingrediënten.",
        "allergies": ["Tree nuts", "Dairy"],
        "variantKeys": ["angled_photo", "glare_fold"],
        "dishes": [
            direct_dish(
                "Amandelkoek met Boter",
                "Amandelspijs, roomboter, suiker",
                "Almond paste and butter are directly named in the visible description.",
            ),
            pattern_dish(
                "Appeltaart van het Huis",
                "Appel en deeg volgens familierecept",
                "The family recipe does not disclose possible nuts or dairy in the pastry.",
            ),
            benign_dish(
                "Citroensorbet",
                "Citroen, water, suiker",
                "No profile allergen is visible, but scoop and surface sharing are unobservable.",
            ),
        ],
    },
]

VARIANTS = [
    {
        "key": "clear_counter",
        "readability": "clear",
        "needsRetake": False,
        "severity": "severe",
        "avoidCrossContact": True,
    },
    {
        "key": "angled_photo",
        "readability": "partially_clear",
        "needsRetake": False,
        "severity": "mild",
        "avoidCrossContact": False,
    },
    {
        "key": "glare_fold",
        "readability": "partially_clear",
        "needsRetake": False,
        "severity": "mild",
        "avoidCrossContact": True,
    },
    {
        "key": "blurred_crop",
        "readability": "poor",
        "needsRetake": True,
        "severity": "severe",
        "avoidCrossContact": False,
    },
]
VARIANTS_BY_KEY = {variant["key"]: variant for variant in VARIANTS}

ORDINAL_RISKS = ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed"]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def normalize_group_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).lower()
    alphanumeric_or_space = "".join(character if character.isalnum() else " " for character in normalized)
    return " ".join(alphanumeric_or_space.split())


def validate_development_separation(source_manifest: dict[str, Any]) -> None:
    """Reject exact development overlap; perceptual near-duplicate detection is intentionally out of scope."""

    try:
        development_manifest = json.loads(DEVELOPMENT_MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AssertionError(
            f"Cannot read authoritative development manifest {DEVELOPMENT_MANIFEST_PATH}: {error}"
        ) from error

    development_groups = development_manifest.get("grouping", {}).get("groups")
    development_cases = development_manifest.get("cases")
    if not isinstance(development_groups, list) or not isinstance(development_cases, list):
        raise AssertionError("The authoritative development manifest must contain grouping.groups and cases arrays.")

    for group in development_groups:
        if (
            not isinstance(group, dict)
            or not isinstance(group.get("id"), str)
            or not group["id"]
            or not isinstance(group.get("name"), str)
            or not group["name"]
        ):
            raise AssertionError("Every authoritative development group must contain non-empty id and name strings.")
    for case in development_cases:
        image = case.get("image") if isinstance(case, dict) else None
        if (
            not isinstance(case, dict)
            or not isinstance(case.get("id"), str)
            or not case["id"]
            or not isinstance(image, dict)
            or not isinstance(image.get("path"), str)
            or not image["path"]
            or not isinstance(image.get("sha256"), str)
            or not image["sha256"]
        ):
            raise AssertionError(
                "Every authoritative development case must contain a non-empty id, image path, and image SHA-256."
            )

    holdout_group_names = {normalize_group_name(group["name"]) for group in source_manifest["groups"]}
    development_group_names = {normalize_group_name(group["name"]) for group in development_groups}
    if "" in holdout_group_names or "" in development_group_names:
        raise AssertionError("Normalized development and holdout group names must not be empty.")

    exact_surfaces = (
        (
            "group ID",
            {group["id"] for group in source_manifest["groups"]},
            {group["id"] for group in development_groups},
        ),
        ("normalized group name", holdout_group_names, development_group_names),
        (
            "case ID",
            {case["id"] for case in source_manifest["cases"]},
            {case["id"] for case in development_cases},
        ),
        (
            "image path",
            {case["imagePath"] for case in source_manifest["cases"]},
            {case["image"]["path"] for case in development_cases},
        ),
        (
            "image SHA-256",
            {case["imageSha256"].lower() for case in source_manifest["cases"]},
            {case["image"]["sha256"].lower() for case in development_cases},
        ),
    )
    for surface, holdout_values, development_values in exact_surfaces:
        overlaps = sorted(holdout_values & development_values)
        if overlaps:
            raise AssertionError(
                f"Cross-split leakage guard rejected overlapping {surface}: {', '.join(overlaps)}"
            )


def ordinal_risk_range(minimum: str, maximum: str) -> dict[str, Any]:
    minimum_index = ORDINAL_RISKS.index(minimum)
    maximum_index = ORDINAL_RISKS.index(maximum)
    if minimum_index > maximum_index:
        raise ValueError(f"Invalid risk range {minimum}..{maximum}")
    return {
        "kind": "ordinal",
        "minimum": minimum,
        "maximum": maximum,
        "levels": ORDINAL_RISKS[minimum_index : maximum_index + 1],
    }


def unclear_risk_range() -> dict[str, Any]:
    return {"kind": "non_ordinal", "minimum": None, "maximum": None, "levels": ["unclear"]}


def font(language: str, size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    if language == "Traditional Chinese":
        path = FONT_PATHS[language]
    else:
        path = FONT_PATHS["bold" if bold else "default"]
    if not path.exists():
        raise FileNotFoundError(f"Required deterministic fixture font is missing: {path}")
    return ImageFont.truetype(str(path), size=size)


def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    text_font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    tokens = text.split(" ") if " " in text else list(text)
    separator = " " if " " in text else ""
    lines: list[str] = []
    current = ""
    for token in tokens:
        candidate = f"{current}{separator if current else ''}{token}"
        if current and draw.textlength(candidate, font=text_font) > max_width:
            lines.append(current)
            current = token
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def render_base_menu(scenario: dict[str, Any], seed: int) -> Image.Image:
    rng = random.Random(seed)
    table = Image.new("RGB", (IMAGE_WIDTH, IMAGE_HEIGHT), (184, 151, 116))
    table_draw = ImageDraw.Draw(table)
    for _ in range(170):
        y = rng.randrange(0, IMAGE_HEIGHT)
        tone = rng.randrange(139, 191)
        table_draw.line(
            (0, y, IMAGE_WIDTH, y + rng.randrange(-3, 4)),
            fill=(tone, tone - 20, tone - 43),
            width=1,
        )

    shadow = Image.new("RGBA", table.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (78, 68, IMAGE_WIDTH - 52, IMAGE_HEIGHT - 42),
        radius=30,
        fill=(31, 28, 24, 78),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    table = Image.alpha_composite(table.convert("RGBA"), shadow).convert("RGB")

    paper = Image.new("RGB", (1040, 1460), (255, 250, 241))
    draw = ImageDraw.Draw(paper)
    for _ in range(110):
        x = rng.randrange(0, paper.width)
        y = rng.randrange(0, paper.height)
        radius = rng.choice((1, 1, 2))
        draw.ellipse((x, y, x + radius, y + radius), fill=(236, 226, 211))

    ink = (38, 58, 54)
    muted = (86, 91, 84)
    accent = (31, 138, 131)
    divider = (224, 214, 200)
    title_font = font(scenario["language"], 58, bold=True)
    label_font = font(scenario["language"], 25, bold=True)
    dish_font = font(scenario["language"], 39, bold=True)
    description_font = font(scenario["language"], 27)
    price_font = font(scenario["language"], 24)
    footer_font = font(scenario["language"], 21)

    title_bbox = draw.textbbox((0, 0), scenario["title"], font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(((paper.width - title_width) / 2, 82), scenario["title"], font=title_font, fill=ink)
    label_bbox = draw.textbbox((0, 0), scenario["menuLabel"], font=label_font)
    label_width = label_bbox[2] - label_bbox[0]
    draw.text(((paper.width - label_width) / 2, 165), scenario["menuLabel"], font=label_font, fill=accent)
    draw.line((106, 222, paper.width - 106, 222), fill=accent, width=4)

    y = 300
    prices = ("18", "16", "8")
    for index, dish in enumerate(scenario["dishes"]):
        draw.text((96, y), dish["name"], font=dish_font, fill=ink)
        draw.text((paper.width - 140, y + 7), prices[index], font=price_font, fill=accent)
        y += 58
        for line in wrap_text(draw, dish["description"], description_font, paper.width - 220):
            draw.text((96, y), line, font=description_font, fill=muted)
            y += 39
        y += 44
        draw.line((96, y, paper.width - 96, y), fill=divider, width=2)
        y += 55

    footer_lines = wrap_text(draw, scenario["footer"], footer_font, paper.width - 192)
    footer_y = paper.height - 54 - (len(footer_lines) * 28)
    for line in footer_lines:
        draw.text((96, footer_y), line, font=footer_font, fill=(112, 105, 95))
        footer_y += 28
    table.paste(paper, (70, 62))
    return table


def apply_variant(base: Image.Image, variant_key: str) -> Image.Image:
    if variant_key == "clear_counter":
        return base

    if variant_key == "angled_photo":
        background = Image.new("RGB", base.size, (72, 68, 62))
        scaled = base.resize((1010, 1347), Image.Resampling.LANCZOS)
        rotated = scaled.rotate(
            4.5,
            resample=Image.Resampling.BICUBIC,
            expand=True,
            fillcolor=(72, 68, 62),
        )
        left = (IMAGE_WIDTH - rotated.width) // 2
        top = (IMAGE_HEIGHT - rotated.height) // 2
        background.paste(rotated, (left, top))
        return ImageEnhance.Contrast(background).enhance(0.96).filter(ImageFilter.GaussianBlur(0.55))

    if variant_key == "glare_fold":
        result = base.copy().convert("RGBA")
        overlay = Image.new("RGBA", result.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.polygon(
            [(735, 0), (980, 0), (560, IMAGE_HEIGHT), (315, IMAGE_HEIGHT)],
            fill=(255, 255, 255, 82),
        )
        overlay_draw.line((610, 58, 560, IMAGE_HEIGHT - 48), fill=(112, 98, 82, 36), width=5)
        result = Image.alpha_composite(result, overlay).convert("RGB")
        return ImageEnhance.Contrast(result).enhance(0.92).filter(ImageFilter.GaussianBlur(0.7))

    if variant_key == "blurred_crop":
        cropped = base.crop((235, 205, 1110, 1435)).resize(
            (IMAGE_WIDTH, IMAGE_HEIGHT),
            Image.Resampling.LANCZOS,
        )
        cropped = cropped.filter(ImageFilter.GaussianBlur(9.0))
        return ImageEnhance.Contrast(cropped).enhance(0.68)

    raise ValueError(f"Unknown holdout variant: {variant_key}")


def jpeg_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(
        output,
        format="JPEG",
        quality=JPEG_QUALITY,
        subsampling=0,
        optimize=False,
        progressive=False,
    )
    return output.getvalue()


def profile_for(case_id: str, scenario: dict[str, Any], variant: dict[str, Any]) -> dict[str, Any]:
    allergies = []
    for index, allergy_name in enumerate(scenario["allergies"]):
        allergies.append(
            {
                "id": f"{case_id.lower()}-allergy-{index + 1}",
                "name": allergy_name,
                "severity": variant["severity"],
                "avoidCrossContact": variant["avoidCrossContact"],
            }
        )
    return {
        "id": f"profile-{case_id.lower()}",
        "name": "Candidate holdout profile",
        "preferredLanguage": "English"
        if scenario["slug"] in TRANSLATION_SCENARIO_SLUGS
        else scenario["language"],
        "restaurantLanguage": scenario["language"],
        "allergies": allergies,
    }


def dish_risk_range(risk_kind: str, severity: str) -> dict[str, Any]:
    if risk_kind == "benign":
        return ordinal_risk_range("low_risk", "ask_staff")
    if risk_kind == "direct":
        if severity == "severe":
            return ordinal_risk_range("avoid_unless_confirmed", "avoid_unless_confirmed")
        return ordinal_risk_range("high_risk", "avoid_unless_confirmed")
    if risk_kind == "pattern":
        if severity == "severe":
            return ordinal_risk_range("ask_staff", "high_risk")
        return ordinal_risk_range("ask_staff", "ask_staff")
    raise ValueError(f"Unknown dish risk kind: {risk_kind}")


def question_requirements(
    scenario: dict[str, Any],
    profile: dict[str, Any],
    variant: dict[str, Any],
) -> list[dict[str, Any]]:
    allergens = [allergy["name"] for allergy in profile["allergies"]]
    language = scenario["language"]
    requirements: list[dict[str, Any]] = []
    if variant["needsRetake"]:
        requirements.append(
            {
                "id": "request-readable-menu",
                "scope": "scan",
                "dishNames": [],
                "intent": "request_readable_menu",
                "allergens": [],
                "requiredLanguages": [language],
            }
        )
    requirements.append(
        {
            "id": "confirm-ingredients",
            "scope": "each_returned_dish",
            "dishNames": [],
            "intent": "confirm_ingredients",
            "allergens": allergens,
            "requiredLanguages": [language],
        }
    )
    if not variant["needsRetake"]:
        pattern_dishes = sorted(
            dish["name"] for dish in scenario["dishes"] if dish["riskKind"] == "pattern"
        )
        requirements.append(
            {
                "id": "confirm-preparation",
                "scope": "named_dishes",
                "dishNames": pattern_dishes,
                "intent": "confirm_preparation",
                "allergens": allergens,
                "requiredLanguages": [language],
            }
        )
    if variant["avoidCrossContact"]:
        requirements.append(
            {
                "id": "confirm-cross-contact",
                "scope": "each_returned_dish",
                "dishNames": [],
                "intent": "confirm_cross_contact",
                "allergens": allergens,
                "requiredLanguages": [language],
            }
        )
    return requirements


def build_assets() -> tuple[dict[str, bytes], bytes, dict[str, Any]]:
    image_assets: dict[str, bytes] = {}
    source_cases: list[dict[str, Any]] = []
    groups = []
    case_number = CASE_START

    for scenario_index, scenario in enumerate(SCENARIOS):
        group_id = f"holdout/{scenario['slug']}"
        case_ids = []
        base = render_base_menu(scenario, seed=910_000 + scenario_index)
        for variant_key in scenario["variantKeys"]:
            variant = VARIANTS_BY_KEY[variant_key]
            case_id = f"I-{case_number:03d}"
            case_number += 1
            case_ids.append(case_id)
            image_path = f"docs/ai-evals/images/holdout/{case_id}.jpg"
            image_data = jpeg_bytes(apply_variant(base, variant["key"]))
            image_assets[image_path] = image_data
            profile = profile_for(case_id, scenario, variant)

            if variant["needsRetake"]:
                overall_risk = {
                    "status": "annotated",
                    "evidenceLabel": "unknown_unobservable",
                    "evidenceSourceUrls": [],
                    "allowedRiskRange": unclear_risk_range(),
                    "note": "The image is intentionally blurred and cropped; a reliable menu-level assessment requires a retake.",
                }
                dish_expectations: list[dict[str, Any]] = []
            else:
                overall_risk = {
                    "status": "annotated",
                    "evidenceLabel": "confirmed_visible",
                    "evidenceSourceUrls": [],
                    "allowedRiskRange": (
                        ordinal_risk_range("avoid_unless_confirmed", "avoid_unless_confirmed")
                        if variant["severity"] == "severe"
                        else ordinal_risk_range("high_risk", "avoid_unless_confirmed")
                    ),
                    "note": "At least one profile allergen or relevant derivative is directly named in readable menu text.",
                }
                dish_expectations = sorted(
                    [
                        {
                            "dishName": dish["name"],
                            "role": dish["role"],
                            "evidenceLabel": dish["evidenceLabel"],
                            "evidenceNote": dish["evidenceNote"],
                            "evidenceSourceUrls": [],
                            "allowedRiskRange": dish_risk_range(
                                dish["riskKind"],
                                variant["severity"],
                            ),
                        }
                        for dish in scenario["dishes"]
                    ],
                    key=lambda item: item["dishName"],
                )

            source_cases.append(
                {
                    "id": case_id,
                    "name": f"{scenario['title']} - {variant['key'].replace('_', ' ')}",
                    "groupId": group_id,
                    "sourceType": "controlled",
                    "critical": variant["severity"] == "severe" or variant["needsRetake"],
                    "language": scenario["language"],
                    "cuisine": scenario["cuisine"],
                    "qualityVariant": variant["key"],
                    "imagePath": image_path,
                    "imageSha256": sha256(image_data),
                    "profile": profile,
                    "expectations": {
                        "readability": {
                            "allowedValues": [variant["readability"]],
                            "needsRetake": variant["needsRetake"],
                        },
                        "overallRisk": overall_risk,
                        "dishes": dish_expectations,
                        "requiredQuestions": question_requirements(scenario, profile, variant),
                    },
                    "reviewStatus": "pending",
                }
            )
        groups.append(
            {
                "id": group_id,
                "kind": "controlled_template",
                "name": scenario["title"],
                "caseIds": case_ids,
            }
        )

    source_manifest = {
        "schemaVersion": "1.0.0-candidate",
        "corpusId": "sift-menu-analysis-holdout-candidate-v1",
        "status": "candidate_pending_human_review",
        "generatorPath": GENERATOR_PATH,
        "generation": {
            "imageWidth": IMAGE_WIDTH,
            "imageHeight": IMAGE_HEIGHT,
            "format": "JPEG",
            "quality": JPEG_QUALITY,
            "subsampling": 0,
            "casesPerGroup": CASES_PER_GROUP,
            "qualityVariants": [variant["key"] for variant in VARIANTS],
        },
        "groups": groups,
        "cases": source_cases,
    }
    source_bytes = (json.dumps(source_manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    return image_assets, source_bytes, source_manifest


def validate_source_manifest(source_manifest: dict[str, Any], image_assets: dict[str, bytes]) -> None:
    groups = source_manifest["groups"]
    cases = source_manifest["cases"]
    if len(SCENARIOS) != EXPECTED_GROUP_COUNT or len(groups) != EXPECTED_GROUP_COUNT:
        raise AssertionError("The candidate holdout must contain exactly 24 independent menu groups.")
    if len(cases) != EXPECTED_CASE_COUNT or len(image_assets) != EXPECTED_CASE_COUNT:
        raise AssertionError("The candidate holdout must contain exactly 48 image cases.")

    slugs = [scenario["slug"] for scenario in SCENARIOS]
    titles = [scenario["title"] for scenario in SCENARIOS]
    cuisines = [scenario["cuisine"] for scenario in SCENARIOS]
    if len(set(slugs)) != len(slugs):
        raise AssertionError("Holdout menu slugs must be unique.")
    if len(set(titles)) != len(titles):
        raise AssertionError("Each holdout menu group must use a distinct synthetic menu title.")
    if any(not isinstance(cuisine, str) or not cuisine.strip() for cuisine in cuisines):
        raise AssertionError("Each holdout menu group must define a reviewed cuisine string.")
    if len(set(cuisines)) != EXPECTED_GROUP_COUNT:
        raise AssertionError("Each independent holdout menu group must preserve a distinct cuisine label.")

    scenario_by_group = {f"holdout/{scenario['slug']}": scenario for scenario in SCENARIOS}
    language_group_counts = Counter(scenario["language"] for scenario in SCENARIOS)
    if set(language_group_counts) != set(EXPECTED_LANGUAGES) or any(
        language_group_counts[language] != 4 for language in EXPECTED_LANGUAGES
    ):
        raise AssertionError("Each of the six underrepresented languages must contain exactly four menu groups.")

    for scenario in SCENARIOS:
        if len(scenario["variantKeys"]) != CASES_PER_GROUP or len(set(scenario["variantKeys"])) != CASES_PER_GROUP:
            raise AssertionError(f"Scenario {scenario['slug']} must select two distinct quality variants.")
        if any(key not in VARIANTS_BY_KEY for key in scenario["variantKeys"]):
            raise AssertionError(f"Scenario {scenario['slug']} selects an unknown quality variant.")
        if not scenario["allergies"] or len(set(scenario["allergies"])) != len(scenario["allergies"]):
            raise AssertionError(f"Scenario {scenario['slug']} must contain unique profile allergens.")
        dish_roles = Counter(dish["riskKind"] for dish in scenario["dishes"])
        if dish_roles != Counter({"direct": 1, "pattern": 1, "benign": 1}):
            raise AssertionError(
                f"Scenario {scenario['slug']} must define one direct, one preparation-pattern, and one benign dish."
            )

    case_ids = [case["id"] for case in cases]
    expected_ids = [f"I-{number:03d}" for number in range(CASE_START, CASE_START + EXPECTED_CASE_COUNT)]
    if case_ids != expected_ids:
        raise AssertionError("Holdout case IDs are not the fixed I-101..I-148 sequence.")
    if len(set(case_ids)) != len(case_ids):
        raise AssertionError("Holdout case IDs must be unique.")

    cases_by_group: dict[str, list[dict[str, Any]]] = {}
    for case in cases:
        cases_by_group.setdefault(case["groupId"], []).append(case)
        if case["reviewStatus"] != "pending":
            raise AssertionError(f"{case['id']} reviewer state must remain pending.")
        if case["sourceType"] != "controlled":
            raise AssertionError(f"{case['id']} must remain a controlled synthetic fixture.")
        if case["language"] not in EXPECTED_LANGUAGES:
            raise AssertionError(f"{case['id']} uses an unexpected holdout language.")
        scenario = scenario_by_group.get(case["groupId"])
        if scenario is None or case["cuisine"] != scenario["cuisine"]:
            raise AssertionError(f"{case['id']} cuisine must match its reviewed menu-group label.")
        if not case["imagePath"].startswith("docs/ai-evals/images/holdout/"):
            raise AssertionError(f"{case['id']} escapes the holdout image directory.")
        image_data = image_assets.get(case["imagePath"])
        if image_data is None or sha256(image_data) != case["imageSha256"]:
            raise AssertionError(f"{case['id']} image hash is inconsistent.")

        readability = case["expectations"]["readability"]
        dishes = case["expectations"]["dishes"]
        question_intents = {
            question["intent"] for question in case["expectations"]["requiredQuestions"]
        }
        avoid_cross_contact = case["profile"]["allergies"][0]["avoidCrossContact"]
        if ("confirm_cross_contact" in question_intents) != avoid_cross_contact:
            raise AssertionError(f"{case['id']} cross-contact question does not match its profile.")
        if readability["needsRetake"]:
            if readability["allowedValues"] != ["poor"] or dishes:
                raise AssertionError(f"Poor case {case['id']} must require a retake and have no dish labels.")
            if "request_readable_menu" not in question_intents:
                raise AssertionError(f"Poor case {case['id']} must request a readable menu.")
        else:
            roles = {dish["role"] for dish in dishes}
            labels = {dish["evidenceLabel"] for dish in dishes}
            if roles != {"risk_target", "benign_control"}:
                raise AssertionError(f"Readable case {case['id']} must include risk and benign labels.")
            if "confirmed_visible" not in labels or "plausible_pattern" not in labels:
                raise AssertionError(f"Readable case {case['id']} must include direct and pattern evidence.")
            if "confirm_preparation" not in question_intents:
                raise AssertionError(f"Readable case {case['id']} must ask about recipe or preparation evidence.")

    for group in groups:
        group_cases = cases_by_group.get(group["id"], [])
        scenario = scenario_by_group.get(group["id"])
        if scenario is None:
            raise AssertionError(f"Group {group['id']} has no independent scenario definition.")
        if len(group_cases) != CASES_PER_GROUP or group["caseIds"] != [case["id"] for case in group_cases]:
            raise AssertionError(f"Group {group['id']} must contain its two ordered cases.")
        if [case["qualityVariant"] for case in group_cases] != scenario["variantKeys"]:
            raise AssertionError(f"Group {group['id']} quality variants drifted from its scenario definition.")
        if {case["language"] for case in group_cases} != {scenario["language"]}:
            raise AssertionError(f"Group {group['id']} must remain within one underrepresented language.")
        if {case["cuisine"] for case in group_cases} != {scenario["cuisine"]}:
            raise AssertionError(f"Group {group['id']} must preserve one reviewed cuisine label.")
        cross_contact = {
            case["profile"]["allergies"][0]["avoidCrossContact"] for case in group_cases
        }
        if cross_contact != {False, True}:
            raise AssertionError(f"Group {group['id']} must vary cross-contact sensitivity across its two cases.")

    expected_variant_count = EXPECTED_CASE_COUNT // len(VARIANTS)
    quality_counts = Counter(case["qualityVariant"] for case in cases)
    if quality_counts != Counter({variant["key"]: expected_variant_count for variant in VARIANTS}):
        raise AssertionError("Each quality variant must appear exactly 12 times across the 48-case holdout.")
    severity_counts = Counter(case["profile"]["allergies"][0]["severity"] for case in cases)
    if severity_counts != Counter({"mild": 24, "severe": 24}):
        raise AssertionError("The holdout must contain exactly 24 mild and 24 severe profiles.")
    cross_contact_counts = Counter(
        case["profile"]["allergies"][0]["avoidCrossContact"] for case in cases
    )
    if cross_contact_counts != Counter({False: 24, True: 24}):
        raise AssertionError("The holdout must contain exactly 24 cross-contact false and 24 true profiles.")
    translation_counts = Counter(
        case["language"]
        for case in cases
        if case["profile"]["preferredLanguage"] != case["profile"]["restaurantLanguage"]
    )
    if translation_counts != Counter({language: 2 for language in EXPECTED_LANGUAGES}):
        raise AssertionError("Each holdout language must include exactly one two-case translation group.")
    retake_count = sum(case["expectations"]["readability"]["needsRetake"] for case in cases)
    if retake_count != 12:
        raise AssertionError("The holdout must contain exactly 12 poor-image retake cases.")


def write_assets(image_assets: dict[str, bytes], source_bytes: bytes) -> None:
    HOLDOUT_DIR.mkdir(parents=True, exist_ok=True)
    for relative_path, data in image_assets.items():
        destination = ROOT / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    SOURCE_MANIFEST_PATH.write_bytes(source_bytes)


def check_assets(image_assets: dict[str, bytes], source_bytes: bytes) -> None:
    expected_jpegs = {Path(path).name for path in image_assets}
    actual_jpegs = {path.name for path in HOLDOUT_DIR.glob("*.jpg")}
    if actual_jpegs != expected_jpegs:
        raise AssertionError("Holdout JPEG membership differs from the deterministic 48-case definition.")
    for relative_path, expected_data in image_assets.items():
        actual_path = ROOT / relative_path
        if not actual_path.exists() or actual_path.read_bytes() != expected_data:
            raise AssertionError(f"Generated image is missing or non-deterministic: {relative_path}")
    if not SOURCE_MANIFEST_PATH.exists() or SOURCE_MANIFEST_PATH.read_bytes() != source_bytes:
        raise AssertionError("Holdout source-cases.json is missing, non-canonical, or out of date.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="Write the deterministic images and source manifest.")
    mode.add_argument("--check", action="store_true", help="Verify checked-in assets byte for byte.")
    args = parser.parse_args()

    image_assets, source_bytes, source_manifest = build_assets()
    validate_source_manifest(source_manifest, image_assets)
    validate_development_separation(source_manifest)
    if args.check:
        check_assets(image_assets, source_bytes)
        action = "Validated"
    else:
        write_assets(image_assets, source_bytes)
        check_assets(image_assets, source_bytes)
        action = "Generated"

    image_fingerprint = {case["id"]: case["imageSha256"] for case in source_manifest["cases"]}
    print(f"{action} 48 candidate holdout images in 24 leakage-safe groups.")
    print(f"Image-set SHA-256: {sha256(canonical_json(image_fingerprint).encode('utf-8'))}")


if __name__ == "__main__":
    main()
