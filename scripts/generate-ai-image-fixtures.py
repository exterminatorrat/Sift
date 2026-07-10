"""Generate deterministic menu images and the 60-case live-eval manifest."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONTROLLED_DIR = ROOT / "docs" / "ai-evals" / "images" / "controlled"
LICENSED_PATH = ROOT / "docs" / "ai-evals" / "licensed-images.json"
MANIFEST_PATH = ROOT / "docs" / "ai-evals" / "image-cases.json"
RANDOM = random.Random(73194)

FONT_PATHS = {
    "Japanese": Path(r"C:\Windows\Fonts\YuGothR.ttc"),
    "Korean": Path(r"C:\Windows\Fonts\malgun.ttf"),
    "Simplified Chinese": Path(r"C:\Windows\Fonts\msyh.ttc"),
    "Thai": Path(r"C:\Windows\Fonts\LeelawUI.ttf"),
    "default": Path(r"C:\Windows\Fonts\segoeui.ttf"),
}

SCENARIOS = [
    {
        "slug": "english-tahini",
        "language": "English",
        "title": "Garden Mezze",
        "allergen": "Sesame",
        "dishes": [
            ("Mezze Plate", "Hummus, tahini, pita and cucumber", "avoid_unless_confirmed"),
            ("Lentil Soup", "Lentils, herbs and olive oil", "ask_staff"),
            ("Plain Rice", "Steamed white rice", "low_risk"),
        ],
    },
    {
        "slug": "spanish-mole",
        "language": "Spanish",
        "title": "Cocina del Sol",
        "allergen": "Peanut",
        "secondaryAllergen": "Sesame",
        "dishes": [
            ("Pollo con Mole", "Pollo, mole poblano, arroz y sesamo", "avoid_unless_confirmed"),
            ("Tacos de Papa", "Papa, col, salsa de la casa", "ask_staff"),
            ("Arroz Blanco", "Arroz al vapor", "low_risk"),
        ],
    },
    {
        "slug": "french-dairy",
        "language": "French",
        "title": "Le Petit Jardin",
        "allergen": "Dairy",
        "dishes": [
            ("Poulet au Beurre", "Poulet, sauce au beurre et herbes", "avoid_unless_confirmed"),
            ("Soupe de Legumes", "Legumes, bouillon, creme fraiche", "high_risk"),
            ("Salade Verte", "Laitue, concombre, citron", "low_risk"),
        ],
    },
    {
        "slug": "german-mustard",
        "language": "German",
        "title": "Waldhaus Karte",
        "allergen": "Mustard",
        "secondaryAllergen": "Sulfites",
        "dishes": [
            ("Bratwurst mit Senfsauce", "Bratwurst, Senfsauce, Kartoffeln", "avoid_unless_confirmed"),
            ("Hahnchen in Weinsauce", "Hahnchen, Weisswein, Krauter", "ask_staff"),
            ("Gedampfter Reis", "Naturreis ohne Sauce", "low_risk"),
        ],
    },
    {
        "slug": "italian-shellfish",
        "language": "Italian",
        "title": "Trattoria Marina",
        "allergen": "Shellfish",
        "secondaryAllergen": "Dairy",
        "dishes": [
            ("Risotto ai Gamberi", "Gamberi, burro, riso e brodo", "avoid_unless_confirmed"),
            ("Polenta Cremosa", "Polenta, panna e parmigiano", "high_risk"),
            ("Verdure Grigliate", "Zucchine, peperoni e olio", "low_risk"),
        ],
    },
    {
        "slug": "portuguese-fish-egg",
        "language": "Portuguese",
        "title": "Mesa Atlantica",
        "allergen": "Fish",
        "secondaryAllergen": "Egg",
        "dishes": [
            ("Bacalhau com Ovo", "Bacalhau, ovo, batata e azeite", "avoid_unless_confirmed"),
            ("Pasteis da Casa", "Pasteis fritos com molho da casa", "ask_staff"),
            ("Arroz Simples", "Arroz branco cozido", "low_risk"),
        ],
    },
    {
        "slug": "japanese-soy-sesame",
        "language": "Japanese",
        "title": "食事処 みどり",
        "allergen": "Soy",
        "secondaryAllergen": "Sesame",
        "dishes": [
            ("しょうゆラーメン", "小麦麺、しょうゆ、だし、ねぎ", "avoid_unless_confirmed"),
            ("ほうれん草のごま和え", "ほうれん草、ごま、たれ", "avoid_unless_confirmed"),
            ("白ごはん", "白米", "low_risk"),
        ],
    },
    {
        "slug": "korean-shellfish-sesame",
        "language": "Korean",
        "title": "한상 식당",
        "allergen": "Shellfish",
        "secondaryAllergen": "Sesame",
        "dishes": [
            ("새우볶음밥", "새우, 밥, 참기름, 간장", "avoid_unless_confirmed"),
            ("비빔국수", "국수, 양념장, 참깨", "high_risk"),
            ("흰쌀밥", "흰쌀", "low_risk"),
        ],
    },
    {
        "slug": "chinese-peanut-sesame",
        "language": "Simplified Chinese",
        "title": "家常小馆",
        "allergen": "Peanut",
        "secondaryAllergen": "Sesame",
        "dishes": [
            ("宫保鸡丁", "鸡肉、花生、酱汁、辣椒", "avoid_unless_confirmed"),
            ("芝麻凉面", "小麦面、芝麻酱、酱油", "avoid_unless_confirmed"),
            ("白米饭", "蒸白米饭", "low_risk"),
        ],
    },
    {
        "slug": "thai-peanut-shellfish",
        "language": "Thai",
        "title": "ครัวริมทาง",
        "allergen": "Peanut",
        "secondaryAllergen": "Shellfish",
        "dishes": [
            ("ผัดไทยกุ้ง", "กุ้ง เส้น ถั่วลิสง ไข่ และน้ำปลา", "avoid_unless_confirmed"),
            ("ไก่ทอดซอสบ้าน", "ไก่ทอด ซอสบ้าน และน้ำมันทอดร่วม", "ask_staff"),
            ("ข้าวสวย", "ข้าวหอมมะลินึ่ง", "low_risk"),
        ],
    },
    {
        "slug": "english-nuts-mango",
        "language": "English",
        "title": "Orchard Desserts",
        "allergen": "Tree nuts",
        "secondaryAllergen": "Mango",
        "dishes": [
            ("Pistachio Mango Tart", "Pistachio crust, mango filling and cream", "avoid_unless_confirmed"),
            ("Chocolate Sundae", "Chocolate sauce, walnut crumble and ice cream", "avoid_unless_confirmed"),
            ("Berry Cup", "Fresh strawberries and blueberries", "low_risk"),
        ],
    },
    {
        "slug": "english-cafe-fryer",
        "language": "English",
        "title": "Station Cafe",
        "allergen": "Wheat/gluten",
        "secondaryAllergen": "Egg",
        "dishes": [
            ("Crispy Chicken", "Flour batter, egg wash, shared fryer and house sauce", "avoid_unless_confirmed"),
            ("Tofu Noodle Bowl", "Wheat noodles, tofu, soy marinade", "high_risk"),
            ("Fruit Plate", "Sliced seasonal fruit", "low_risk"),
        ],
    },
]

VARIANTS = [
    ("clear", "clear", "severe", True),
    ("small_text", "partially_clear", "mild", False),
    ("skewed", "partially_clear", "severe", True),
    ("challenge", None, "severe", True),
]

CHALLENGES = [
    ("blurred", "poor"),
    ("glare", "partially_clear"),
    ("cropped", "poor"),
    ("partial", "partially_clear"),
]


def font(language: str, size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_PATHS.get(language, FONT_PATHS["default"])
    if bold and language not in {"Japanese", "Korean", "Simplified Chinese", "Thai"}:
        bold_path = Path(r"C:\Windows\Fonts\segoeuib.ttf")
        if bold_path.exists():
            path = bold_path
    return ImageFont.truetype(str(path), size=size)


def wrap(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = text.split(" ")
    if len(words) == 1:
        return [text]
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=text_font) <= width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def render_menu(scenario: dict, variant: str) -> Image.Image:
    width, height = (1200, 1600)
    bg = (255, 248, 239)
    ink = (30, 55, 53)
    accent = (31, 138, 131)
    image = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(image)

    title_size = 72 if variant != "small_text" else 54
    dish_size = 46 if variant != "small_text" else 31
    detail_size = 31 if variant != "small_text" else 23
    title_font = font(scenario["language"], title_size, True)
    dish_font = font(scenario["language"], dish_size, True)
    detail_font = font(scenario["language"], detail_size)
    small_font = font(scenario["language"], 24)

    draw.rounded_rectangle((76, 70, width - 76, height - 70), radius=24, fill=(255, 253, 249), outline=(229, 217, 204), width=3)
    title_box = draw.textbbox((0, 0), scenario["title"], font=title_font)
    title_width = title_box[2] - title_box[0]
    draw.text(((width - title_width) / 2, 125), scenario["title"], font=title_font, fill=ink)
    draw.line((160, 235, width - 160, 235), fill=accent, width=5)
    draw.text((110, 265), "MENU", font=small_font, fill=accent)

    y = 335
    for index, (name, description, _risk) in enumerate(scenario["dishes"]):
        draw.text((112, y), name, font=dish_font, fill=ink)
        y += dish_size + 20
        for line in wrap(draw, description, detail_font, width - 224):
            draw.text((112, y), line, font=detail_font, fill=(77, 87, 82))
            y += detail_size + 11
        draw.text((width - 235, y - detail_size - 6), f"{12 + index * 3}.00", font=detail_font, fill=accent)
        y += 65 if variant != "small_text" else 38
        draw.line((112, y, width - 112, y), fill=(232, 224, 215), width=2)
        y += 55 if variant != "small_text" else 34

    draw.text((112, height - 150), "Ingredients and preparation may change. Please ask staff.", font=small_font, fill=(107, 103, 96))
    return image


def apply_variant(image: Image.Image, variant: str) -> Image.Image:
    if variant == "clear":
        return image
    if variant == "small_text":
        canvas = Image.new("RGB", image.size, (232, 225, 216))
        scaled = image.resize((930, 1240), Image.Resampling.LANCZOS)
        canvas.paste(scaled, (135, 180))
        return canvas.filter(ImageFilter.GaussianBlur(0.45))
    if variant == "skewed":
        rotated = image.rotate(6.5, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(218, 211, 202))
        left = (rotated.width - 1200) // 2
        top = (rotated.height - 1600) // 2
        return rotated.crop((left, top, left + 1200, top + 1600))
    if variant == "blurred":
        result = image.filter(ImageFilter.GaussianBlur(8.5))
        return ImageEnhance.Contrast(result).enhance(0.72)
    if variant == "glare":
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        for offset in range(-180, 520, 18):
            alpha = max(0, 115 - abs(offset - 160) // 3)
            draw.polygon([(offset, 0), (offset + 230, 0), (offset + 830, 1600), (offset + 590, 1600)], fill=(255, 255, 255, alpha))
        return Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    if variant == "cropped":
        cropped = image.crop((270, 190, 1200, 1450)).resize((1200, 1600), Image.Resampling.LANCZOS)
        return cropped.filter(ImageFilter.GaussianBlur(1.8))
    if variant == "partial":
        overlay = image.copy()
        draw = ImageDraw.Draw(overlay)
        draw.polygon([(0, 0), (390, 0), (170, 1600), (0, 1600)], fill=(54, 58, 59))
        return overlay
    raise ValueError(f"Unknown image variant: {variant}")


def make_profile(case_id: str, scenario: dict, severity: str, cross_contact: bool, native_user_language: bool) -> dict:
    allergies = [
        {
            "id": f"{case_id.lower()}-primary",
            "name": scenario["allergen"],
            "severity": severity,
            "avoidCrossContact": cross_contact,
        }
    ]
    if scenario.get("secondaryAllergen"):
        allergies.append(
            {
                "id": f"{case_id.lower()}-secondary",
                "name": scenario["secondaryAllergen"],
                "severity": "moderate" if severity == "mild" else severity,
                "avoidCrossContact": cross_contact,
            }
        )
    return {
        "id": f"profile-{case_id.lower()}",
        "name": "Reliability test",
        "preferredLanguage": scenario["language"] if native_user_language else "English",
        "restaurantLanguage": scenario["language"],
        "allergies": allergies,
    }


def controlled_cases() -> list[dict]:
    cases: list[dict] = []
    CONTROLLED_DIR.mkdir(parents=True, exist_ok=True)
    case_number = 1
    for scenario_index, scenario in enumerate(SCENARIOS):
        for variant_index, (variant, readability, severity, cross_contact) in enumerate(VARIANTS):
            actual_variant = variant
            actual_readability = readability
            if variant == "challenge":
                actual_variant, actual_readability = CHALLENGES[scenario_index % len(CHALLENGES)]
            case_id = f"I-{case_number:03d}"
            image_path = CONTROLLED_DIR / f"{case_id}.jpg"
            image = apply_variant(render_menu(scenario, variant), actual_variant)
            image.save(image_path, format="JPEG", quality=88, optimize=True)
            poor = actual_readability == "poor"
            expected_risks = [] if poor else [
                {
                    "dishName": dish_name,
                    "minimumRisk": risk,
                    "directListed": risk == "avoid_unless_confirmed",
                }
                for dish_name, _description, risk in scenario["dishes"]
                if risk != "low_risk"
            ]
            cases.append(
                {
                    "id": case_id,
                    "name": f"{scenario['title']} - {actual_variant.replace('_', ' ')}",
                    "sourceType": "controlled",
                    "imagePath": image_path.relative_to(ROOT).as_posix(),
                    "language": scenario["language"],
                    "qualityVariant": actual_variant,
                    "profile": make_profile(case_id, scenario, severity, cross_contact, variant_index in {1, 2}),
                    "critical": severity == "severe" and (poor or any(item[2] == "avoid_unless_confirmed" for item in scenario["dishes"])),
                    "expected": {
                        "readability": actual_readability,
                        "needsRetake": poor,
                        "overallRisk": "unclear" if poor else None,
                        "minimumRisks": expected_risks,
                        "benignDishes": [] if poor else [dish[0] for dish in scenario["dishes"] if dish[2] == "low_risk"],
                    },
                }
            )
            case_number += 1
    return cases


def licensed_cases() -> list[dict]:
    fixtures = json.loads(LICENSED_PATH.read_text(encoding="utf-8"))
    cases = []
    for fixture in fixtures:
        poor = fixture["quality"] == "poor"
        cases.append(
            {
                **fixture,
                "sourceType": "licensed",
                "qualityVariant": "real_world",
                "profile": {
                    "id": f"profile-{fixture['id'].lower()}",
                    "name": "Licensed image test",
                    "preferredLanguage": "English",
                    "restaurantLanguage": fixture["language"],
                    "allergies": [
                        {"id": "peanut", "name": "Peanut", "severity": "severe", "avoidCrossContact": True},
                        {"id": "sesame", "name": "Sesame", "severity": "severe", "avoidCrossContact": True},
                    ],
                },
                "critical": poor,
                "expected": {
                    "readability": fixture["quality"],
                    "needsRetake": poor,
                    "overallRisk": "unclear" if poor else None,
                    "minimumRisks": [],
                    "benignDishes": [],
                },
            }
        )
    return cases


def main() -> None:
    cases = controlled_cases() + licensed_cases()
    assert len(cases) == 60
    MANIFEST_PATH.write_text(json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(cases)} image eval cases at {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
