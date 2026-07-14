"""Generate Sift's deterministic multi-page AI diagnostic corpus.

This corpus is intentionally separate from the development benchmark and the
holdout. Run with --write (or no flag) to generate the manifest and JPEGs, and
run with --check to verify checked-in assets byte for byte.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = "scripts/generate-ai-multipage-fixtures.py"
OUTPUT_DIR = ROOT / "docs" / "ai-evals" / "images" / "multi-page"
MANIFEST_PATH = ROOT / "docs" / "ai-evals" / "multi-page-cases.json"

IMAGE_WIDTH = 1200
IMAGE_HEIGHT = 1600
JPEG_QUALITY = 90
EXPECTED_CASE_COUNT = 8
RISK_LEVELS = ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed"]

FONT_PATHS = {
    "Japanese": Path(r"C:\Windows\Fonts\YuGothR.ttc"),
    "Simplified Chinese": Path(r"C:\Windows\Fonts\msyh.ttc"),
    "Thai": Path(r"C:\Windows\Fonts\LeelawUI.ttf"),
    "default": Path(r"C:\Windows\Fonts\segoeui.ttf"),
    "bold": Path(r"C:\Windows\Fonts\segoeuib.ttf"),
}

FOOTERS = {
    "English": "Ingredients and preparation can change. Please confirm with staff.",
    "Spanish": "Los ingredientes y la preparación pueden cambiar. Consulte al personal.",
    "Japanese": "食材と調理方法は変更される場合があります。スタッフにご確認ください。",
    "Simplified Chinese": "食材和制作方法可能会变化，请向工作人员确认。",
    "Thai": "ส่วนผสมและวิธีปรุงอาจเปลี่ยนแปลง โปรดสอบถามพนักงาน",
    "German": "Zutaten und Zubereitung können sich ändern. Bitte beim Personal nachfragen.",
    "Italian": "Ingredienti e preparazione possono cambiare. Chiedere conferma al personale.",
}

QUALITY_EXPECTATIONS = {
    "clear": {
        "allowedValues": ["clear"],
        "needsRetake": False,
        "issues": [],
    },
    "poor": {
        "allowedValues": ["poor"],
        "needsRetake": True,
        "issues": ["blur", "low_contrast"],
    },
    "cropped": {
        "allowedValues": ["partially_clear"],
        "needsRetake": False,
        "issues": ["crop"],
    },
    "partial_glare": {
        "allowedValues": ["partially_clear"],
        "needsRetake": False,
        "issues": ["partial_occlusion", "glare"],
    },
}

REQUIRED_SCENARIOS = {
    "page_2_direct_allergen",
    "benign_and_severe_pages",
    "repeated_dish_deduplication",
    "one_poor_page_among_readable",
    "cropped_page",
    "partial_glare_page",
    "non_english_menu",
    "max_four_page_path",
}

REQUIRED_LANGUAGES = {
    "English",
    "Spanish",
    "Japanese",
    "Simplified Chinese",
    "Thai",
    "German",
    "Italian",
}


def allergy(name: str, severity: str, avoid_cross_contact: bool) -> dict[str, Any]:
    return {
        "name": name,
        "severity": severity,
        "avoidCrossContact": avoid_cross_contact,
    }


def menu_dish(name: str, description: str, price: str) -> dict[str, str]:
    return {"name": name, "description": description, "price": price}


def page(
    section: str,
    quality: str,
    content_labels: list[str],
    dishes: list[dict[str, str]],
) -> dict[str, Any]:
    return {
        "section": section,
        "quality": quality,
        "contentLabels": content_labels,
        "dishes": dishes,
    }


def ordinal_risk_range(minimum: str, maximum: str) -> dict[str, Any]:
    minimum_index = RISK_LEVELS.index(minimum)
    maximum_index = RISK_LEVELS.index(maximum)
    if minimum_index > maximum_index:
        raise ValueError(f"Invalid risk range: {minimum}..{maximum}")
    return {
        "kind": "ordinal",
        "minimum": minimum,
        "maximum": maximum,
        "levels": RISK_LEVELS[minimum_index : maximum_index + 1],
    }


def expected_dish(
    dish_name: str,
    source_page_numbers: list[int],
    role: str,
    evidence_label: str,
    evidence_note: str,
    minimum_risk: str,
    maximum_risk: str,
) -> dict[str, Any]:
    return {
        "dishName": dish_name,
        "sourcePageNumbers": source_page_numbers,
        "role": role,
        "evidenceLabel": evidence_label,
        "evidenceNote": evidence_note,
        "allowedRiskRange": ordinal_risk_range(minimum_risk, maximum_risk),
    }


SCENARIOS: list[dict[str, Any]] = [
    {
        "id": "MP-001",
        "name": "Harbor Lunch - allergen appears on page 2",
        "language": "English",
        "cuisine": "Contemporary cafe",
        "title": "Harbor Lunch",
        "preferredLanguage": "English",
        "accent": (18, 118, 108),
        "diagnosticScenarios": ["page_2_direct_allergen"],
        "aggregateReadability": "clear",
        "allergies": [allergy("Peanut", "severe", True)],
        "pages": [
            page(
                "Light Plates",
                "clear",
                ["benign_only"],
                [
                    menu_dish("Garden Salad", "Lettuce, cucumber, tomato and lemon", "$9"),
                    menu_dish("Steamed Rice", "White rice and sea salt", "$5"),
                ],
            ),
            page(
                "Noodles & Grill",
                "clear",
                ["direct_profile_allergen"],
                [
                    menu_dish(
                        "Peanut Satay Noodles",
                        "Rice noodles, peanut satay sauce, scallion and lime",
                        "$16",
                    ),
                    menu_dish("Citrus Chicken", "Grilled chicken, orange and herbs", "$18"),
                ],
            ),
        ],
        "dishes": [
            expected_dish(
                "Garden Salad",
                [1],
                "benign_control",
                "unknown_unobservable",
                "No peanut is visible, while recipe completeness and shared preparation remain unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Peanut Satay Noodles",
                [2],
                "risk_target",
                "confirmed_visible",
                "Peanut and peanut satay sauce are directly named on page 2.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Citrus Chicken",
                [2],
                "benign_control",
                "unknown_unobservable",
                "No peanut is visible, but the complete marinade and kitchen handling are not shown.",
                "low_risk",
                "ask_staff",
            ),
        ],
    },
    {
        "id": "MP-002",
        "name": "Casa del Patio - benign and severe pages",
        "language": "Spanish",
        "cuisine": "Spanish neighborhood kitchen",
        "title": "Casa del Patio",
        "preferredLanguage": "English",
        "accent": (183, 65, 52),
        "diagnosticScenarios": ["benign_and_severe_pages", "non_english_menu"],
        "aggregateReadability": "clear",
        "allergies": [
            allergy("Sesame", "severe", True),
            allergy("Shellfish", "severe", True),
        ],
        "pages": [
            page(
                "Entradas suaves",
                "clear",
                ["benign_only"],
                [
                    menu_dish("Ensalada de tomate", "Tomate, pepino, limón y aceite de oliva", "9 €"),
                    menu_dish("Arroz blanco", "Arroz al vapor con sal", "5 €"),
                ],
            ),
            page(
                "Platos principales",
                "clear",
                ["direct_profile_allergen", "severe_risk_page"],
                [
                    menu_dish(
                        "Pollo con sésamo",
                        "Pollo, salsa de sésamo y semillas de sésamo",
                        "18 €",
                    ),
                    menu_dish("Camarones al ajillo", "Camarones, ajo, perejil y aceite", "21 €"),
                ],
            ),
            page(
                "Sopas",
                "clear",
                ["preparation_unknown"],
                [
                    menu_dish("Sopa de la casa", "Caldo del día, verduras y especias de la casa", "8 €"),
                    menu_dish("Fruta fresca", "Fruta de temporada", "7 €"),
                ],
            ),
        ],
        "dishes": [
            expected_dish(
                "Ensalada de tomate",
                [1],
                "benign_control",
                "unknown_unobservable",
                "No profile allergen is visible; ingredient completeness and cross-contact remain unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Arroz blanco",
                [1],
                "benign_control",
                "unknown_unobservable",
                "The visible description is simple, while shared preparation cannot be assessed from the menu.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Pollo con sésamo",
                [2],
                "risk_target",
                "confirmed_visible",
                "Sesame sauce and sesame seeds are directly named on page 2.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Camarones al ajillo",
                [2],
                "risk_target",
                "confirmed_visible",
                "Shrimp is directly named on page 2 for the severe shellfish profile.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Sopa de la casa",
                [3],
                "risk_target",
                "plausible_pattern",
                "The daily broth and house spices are not fully specified.",
                "ask_staff",
                "high_risk",
            ),
            expected_dish(
                "Fruta fresca",
                [3],
                "benign_control",
                "unknown_unobservable",
                "No profile allergen is visible, but handling remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
        ],
    },
    {
        "id": "MP-003",
        "name": "青葉食堂 - repeated dish across four pages",
        "language": "Japanese",
        "cuisine": "Japanese set meals",
        "title": "青葉食堂",
        "preferredLanguage": "English",
        "accent": (43, 105, 166),
        "diagnosticScenarios": [
            "repeated_dish_deduplication",
            "non_english_menu",
            "max_four_page_path",
        ],
        "aggregateReadability": "clear",
        "allergies": [
            allergy("Soy", "severe", True),
            allergy("Sesame", "moderate", False),
        ],
        "pages": [
            page(
                "冷菜",
                "clear",
                ["direct_profile_allergen", "repeated_dish"],
                [
                    menu_dish("胡麻冷ややっこ", "豆腐、白ごま、しょうゆ", "¥680"),
                    menu_dish("塩きゅうり", "きゅうり、塩、柚子", "¥420"),
                ],
            ),
            page(
                "焼き物",
                "clear",
                ["direct_profile_allergen"],
                [
                    menu_dish("焼きおにぎり", "米、しょうゆ、ねぎ", "¥520"),
                    menu_dish("焼きしいたけ", "しいたけ、塩、すだち", "¥590"),
                ],
            ),
            page(
                "おすすめ再掲",
                "clear",
                ["direct_profile_allergen", "repeated_dish"],
                [
                    menu_dish("胡麻冷ややっこ", "豆腐、白ごま、しょうゆ（再掲）", "¥680"),
                    menu_dish("季節の野菜", "旬の野菜、だし、調味料", "¥760"),
                ],
            ),
            page(
                "ご飯",
                "clear",
                ["benign_only"],
                [
                    menu_dish("白ごはん", "国産米", "¥350"),
                    menu_dish("柚子ゼリー", "柚子、寒天、砂糖", "¥480"),
                ],
            ),
        ],
        "dishes": [
            expected_dish(
                "胡麻冷ややっこ",
                [1, 3],
                "risk_target",
                "confirmed_visible",
                "The same dish is listed on pages 1 and 3; tofu, sesame, and soy sauce are directly visible.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "塩きゅうり",
                [1],
                "benign_control",
                "unknown_unobservable",
                "No soy or sesame is visible, while shared preparation remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "焼きおにぎり",
                [2],
                "risk_target",
                "confirmed_visible",
                "Soy sauce is directly named on page 2.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "季節の野菜",
                [3],
                "risk_target",
                "plausible_pattern",
                "Stock and seasoning are visible but unspecified.",
                "ask_staff",
                "high_risk",
            ),
            expected_dish(
                "白ごはん",
                [4],
                "benign_control",
                "unknown_unobservable",
                "Only rice is visible, while kitchen handling is not shown.",
                "low_risk",
                "ask_staff",
            ),
        ],
    },
    {
        "id": "MP-004",
        "name": "江南小馆 - one poor page among readable pages",
        "language": "Simplified Chinese",
        "cuisine": "Jiangnan home cooking",
        "title": "江南小馆",
        "preferredLanguage": "Simplified Chinese",
        "accent": (139, 75, 149),
        "diagnosticScenarios": ["one_poor_page_among_readable", "non_english_menu"],
        "aggregateReadability": "partially_clear",
        "allergies": [
            allergy("Shellfish", "severe", True),
            allergy("Soy", "moderate", False),
        ],
        "pages": [
            page(
                "凉菜",
                "clear",
                ["benign_only"],
                [
                    menu_dish("拍黄瓜", "黄瓜、蒜、米醋", "¥22"),
                    menu_dish("白米饭", "蒸白米", "¥6"),
                ],
            ),
            page(
                "家常热菜",
                "poor",
                ["unscored_poor_content"],
                [
                    menu_dish("宫保豆腐", "豆腐、花生、酱油、辣椒", "¥42"),
                    menu_dish("每日例汤", "当天高汤和时蔬", "¥18"),
                ],
            ),
            page(
                "炒饭与时蔬",
                "clear",
                ["direct_profile_allergen"],
                [
                    menu_dish("虾仁炒饭", "虾仁、米饭、鸡蛋、酱油", "¥48"),
                    menu_dish("清炒时蔬", "青菜、姜、盐", "¥32"),
                ],
            ),
        ],
        "dishes": [
            expected_dish(
                "拍黄瓜",
                [1],
                "benign_control",
                "unknown_unobservable",
                "No shellfish or soy is visible, while preparation completeness remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "白米饭",
                [1],
                "benign_control",
                "unknown_unobservable",
                "Only steamed rice is visible, while shared preparation is not shown.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "虾仁炒饭",
                [3],
                "risk_target",
                "confirmed_visible",
                "Shrimp and soy sauce are directly named on readable page 3.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "清炒时蔬",
                [3],
                "benign_control",
                "unknown_unobservable",
                "No profile allergen is visible, while wok sharing remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
        ],
    },
    {
        "id": "MP-005",
        "name": "ครัวริมทาง - cropped second page",
        "language": "Thai",
        "cuisine": "Thai street kitchen",
        "title": "ครัวริมทาง",
        "preferredLanguage": "English",
        "accent": (18, 132, 82),
        "diagnosticScenarios": ["cropped_page", "non_english_menu"],
        "aggregateReadability": "partially_clear",
        "allergies": [allergy("Peanut", "severe", True)],
        "pages": [
            page(
                "ข้าวและผัก",
                "clear",
                ["benign_only"],
                [
                    menu_dish("ข้าวสวย", "ข้าวหอมมะลินึ่ง", "฿45"),
                    menu_dish("แตงกวากับมะนาว", "แตงกวา มะนาว และเกลือ", "฿70"),
                ],
            ),
            page(
                "อาหารจานหลัก",
                "cropped",
                ["direct_profile_allergen"],
                [
                    menu_dish("ส้มตำถั่วลิสง", "มะละกอ ถั่วลิสง น้ำปลา และมะนาว", "฿140"),
                    menu_dish("ไก่ย่าง", "ไก่ย่างกับซอสของร้าน", "฿180"),
                ],
            ),
        ],
        "dishes": [
            expected_dish(
                "ข้าวสวย",
                [1],
                "benign_control",
                "unknown_unobservable",
                "Only steamed jasmine rice is visible, while handling remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "ส้มตำถั่วลิสง",
                [2],
                "risk_target",
                "confirmed_visible",
                "Peanut remains directly visible on the intentionally cropped page.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "ไก่ย่าง",
                [2],
                "risk_target",
                "plausible_pattern",
                "The house sauce is visible but its ingredients are unspecified.",
                "ask_staff",
                "high_risk",
            ),
        ],
    },
    {
        "id": "MP-006",
        "name": "Zum Stadtgarten - partial glare page",
        "language": "German",
        "cuisine": "German regional kitchen",
        "title": "Zum Stadtgarten",
        "preferredLanguage": "German",
        "accent": (49, 96, 163),
        "diagnosticScenarios": ["partial_glare_page", "non_english_menu"],
        "aggregateReadability": "partially_clear",
        "allergies": [
            allergy("Mustard", "severe", True),
            allergy("Sulfites", "mild", False),
        ],
        "pages": [
            page(
                "Beilagen",
                "clear",
                ["benign_only"],
                [
                    menu_dish("Gedämpfter Reis", "Reis, Wasser und Salz", "5 €"),
                    menu_dish("Gurkensalat", "Gurke, Dill und Essig", "7 €"),
                ],
            ),
            page(
                "Hauptgerichte",
                "partial_glare",
                ["direct_profile_allergen"],
                [
                    menu_dish(
                        "Bratwurst mit Senfsauce",
                        "Bratwurst, Senf, Kartoffeln und Kräuter",
                        "18 €",
                    ),
                    menu_dish(
                        "Hähnchen in Weißweinsauce",
                        "Hähnchen, Weißwein, Zwiebel und Kräuter",
                        "20 €",
                    ),
                ],
            ),
            page(
                "Suppen",
                "clear",
                ["preparation_unknown"],
                [
                    menu_dish("Kartoffelsuppe", "Kartoffeln, Brühe und Hausgewürze", "9 €"),
                    menu_dish("Apfelkompott", "Apfel, Zucker und Zimt", "7 €"),
                ],
            ),
        ],
        "dishes": [
            expected_dish(
                "Gedämpfter Reis",
                [1],
                "benign_control",
                "unknown_unobservable",
                "No mustard or sulfite source is visible, while shared preparation remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Bratwurst mit Senfsauce",
                [2],
                "risk_target",
                "confirmed_visible",
                "Mustard is directly named on the partially occluded, glare-affected page.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Hähnchen in Weißweinsauce",
                [2],
                "risk_target",
                "confirmed_visible",
                "White wine is directly named as a sulfite-relevant ingredient.",
                "high_risk",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Kartoffelsuppe",
                [3],
                "risk_target",
                "plausible_pattern",
                "Broth and house spices are visible but unspecified.",
                "ask_staff",
                "high_risk",
            ),
            expected_dish(
                "Apfelkompott",
                [3],
                "benign_control",
                "unknown_unobservable",
                "No profile allergen is visible, while full preparation remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
        ],
    },
    {
        "id": "MP-007",
        "name": "Trattoria del Porto - four-page shellfish and dairy",
        "language": "Italian",
        "cuisine": "Italian coastal kitchen",
        "title": "Trattoria del Porto",
        "preferredLanguage": "English",
        "accent": (183, 62, 64),
        "diagnosticScenarios": ["non_english_menu", "max_four_page_path"],
        "aggregateReadability": "clear",
        "allergies": [
            allergy("Shellfish", "severe", True),
            allergy("Dairy", "moderate", False),
        ],
        "pages": [
            page(
                "Antipasti",
                "clear",
                ["benign_only"],
                [
                    menu_dish("Bruschetta al Pomodoro", "Pane, pomodoro, basilico e olio", "9 €"),
                    menu_dish("Olive Marinate", "Olive, limone ed erbe", "7 €"),
                ],
            ),
            page(
                "Primi",
                "clear",
                ["direct_profile_allergen", "severe_risk_page"],
                [
                    menu_dish("Risotto ai Gamberi", "Gamberi, burro, riso e brodo", "22 €"),
                    menu_dish("Pasta al Pomodoro", "Pasta, pomodoro, aglio e basilico", "16 €"),
                ],
            ),
            page(
                "Contorni",
                "clear",
                ["direct_profile_allergen"],
                [
                    menu_dish("Polenta al Parmigiano", "Polenta, burro e parmigiano", "11 €"),
                    menu_dish("Verdure Grigliate", "Zucchine, peperoni e olio", "10 €"),
                ],
            ),
            page(
                "Dolci",
                "clear",
                ["benign_only", "preparation_unknown"],
                [
                    menu_dish("Sorbetto al Limone", "Limone, acqua e zucchero", "8 €"),
                    menu_dish("Dolce del Giorno", "Ricetta del giorno", "9 €"),
                ],
            ),
        ],
        "dishes": [
            expected_dish(
                "Bruschetta al Pomodoro",
                [1],
                "benign_control",
                "unknown_unobservable",
                "No shellfish or dairy is visible, while shared preparation remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Risotto ai Gamberi",
                [2],
                "risk_target",
                "confirmed_visible",
                "Shrimp and butter are directly named on page 2.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Polenta al Parmigiano",
                [3],
                "risk_target",
                "confirmed_visible",
                "Butter and parmesan are directly named on page 3.",
                "high_risk",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Verdure Grigliate",
                [3],
                "benign_control",
                "unknown_unobservable",
                "No profile allergen is visible, while grill sharing remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Sorbetto al Limone",
                [4],
                "benign_control",
                "unknown_unobservable",
                "No profile allergen is visible, while scoop and surface sharing are not shown.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Dolce del Giorno",
                [4],
                "risk_target",
                "plausible_pattern",
                "The daily recipe does not disclose its ingredients.",
                "ask_staff",
                "high_risk",
            ),
        ],
    },
    {
        "id": "MP-008",
        "name": "Market Table - clear four-page control",
        "language": "English",
        "cuisine": "Modern market kitchen",
        "title": "Market Table",
        "preferredLanguage": "English",
        "accent": (177, 84, 24),
        "diagnosticScenarios": ["max_four_page_path"],
        "aggregateReadability": "clear",
        "allergies": [
            allergy("Dairy", "severe", True),
            allergy("Soy", "moderate", True),
        ],
        "pages": [
            page(
                "Fresh",
                "clear",
                ["benign_only"],
                [
                    menu_dish("Fruit Cup", "Melon, berries and citrus", "$8"),
                    menu_dish("Cucumber Plate", "Cucumber, radish, lemon and salt", "$9"),
                ],
            ),
            page(
                "Soups",
                "clear",
                ["direct_profile_allergen", "severe_risk_page"],
                [
                    menu_dish("Creamy Tomato Soup", "Tomato, cream, butter and herbs", "$12"),
                    menu_dish("Daily Broth", "Chef's broth and seasonal vegetables", "$11"),
                ],
            ),
            page(
                "Bowls",
                "clear",
                ["direct_profile_allergen"],
                [
                    menu_dish("Tofu Grain Bowl", "Tofu, brown rice, soy dressing and greens", "$17"),
                    menu_dish("Roasted Vegetable Bowl", "Vegetables, rice and house dressing", "$16"),
                ],
            ),
            page(
                "Sides",
                "clear",
                ["benign_only"],
                [
                    menu_dish("Market Salad", "Greens, cucumber, lemon and olive oil", "$10"),
                    menu_dish("Plain Rice", "Steamed white rice", "$5"),
                ],
            ),
        ],
        "dishes": [
            expected_dish(
                "Fruit Cup",
                [1],
                "benign_control",
                "unknown_unobservable",
                "No dairy or soy is visible, while handling remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Creamy Tomato Soup",
                [2],
                "risk_target",
                "confirmed_visible",
                "Cream and butter are directly named on page 2.",
                "avoid_unless_confirmed",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Daily Broth",
                [2],
                "risk_target",
                "plausible_pattern",
                "The chef's broth is visible but its ingredients are unspecified.",
                "ask_staff",
                "high_risk",
            ),
            expected_dish(
                "Tofu Grain Bowl",
                [3],
                "risk_target",
                "confirmed_visible",
                "Tofu and soy dressing are directly named on page 3.",
                "high_risk",
                "avoid_unless_confirmed",
            ),
            expected_dish(
                "Roasted Vegetable Bowl",
                [3],
                "risk_target",
                "plausible_pattern",
                "The house dressing is visible but unspecified.",
                "ask_staff",
                "high_risk",
            ),
            expected_dish(
                "Market Salad",
                [4],
                "benign_control",
                "unknown_unobservable",
                "No profile allergen is visible, while shared preparation remains unobservable.",
                "low_risk",
                "ask_staff",
            ),
            expected_dish(
                "Plain Rice",
                [4],
                "benign_control",
                "unknown_unobservable",
                "Only steamed rice is visible, while kitchen handling is not shown.",
                "low_risk",
                "ask_staff",
            ),
        ],
    },
]


def font(language: str, size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    if language in {"Japanese", "Simplified Chinese", "Thai"}:
        path = FONT_PATHS[language]
    else:
        path = FONT_PATHS["bold" if bold else "default"]
    if not path.exists():
        path = FONT_PATHS["default"]
    return ImageFont.truetype(str(path), size=size)


def fitted_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    language: str,
    initial_size: int,
    minimum_size: int,
    max_width: int,
    bold: bool = False,
) -> ImageFont.FreeTypeFont:
    size = initial_size
    while size > minimum_size:
        candidate = font(language, size, bold)
        if draw.textlength(text, font=candidate) <= max_width:
            return candidate
        size -= 2
    return font(language, minimum_size, bold)


def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    text_font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    if draw.textlength(text, font=text_font) <= max_width:
        return [text]
    separator = " " if " " in text else ""
    tokens = text.split(" ") if separator else list(text)
    lines: list[str] = []
    current = ""
    for token in tokens:
        candidate = f"{current}{separator}{token}" if current else token
        if draw.textlength(candidate, font=text_font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = token
    if current:
        lines.append(current)
    return lines


def render_page(scenario: dict[str, Any], page_data: dict[str, Any], page_number: int) -> Image.Image:
    background = (242, 244, 241)
    paper = (255, 255, 252)
    ink = (27, 38, 42)
    secondary_ink = (73, 82, 84)
    divider = (218, 224, 220)
    accent = scenario["accent"]
    image = Image.new("RGB", (IMAGE_WIDTH, IMAGE_HEIGHT), background)
    draw = ImageDraw.Draw(image)

    draw.rectangle((58, 48, IMAGE_WIDTH - 58, IMAGE_HEIGHT - 48), fill=paper, outline=(201, 209, 204), width=3)
    page_font = font(scenario["language"], 24, True)
    page_label = f"PAGE {page_number} / {len(scenario['pages'])}"
    draw.text((96, 86), page_label, font=page_font, fill=accent)

    title_font = fitted_font(
        draw,
        scenario["title"],
        scenario["language"],
        68,
        46,
        IMAGE_WIDTH - 220,
        True,
    )
    title_width = draw.textlength(scenario["title"], font=title_font)
    draw.text(((IMAGE_WIDTH - title_width) / 2, 142), scenario["title"], font=title_font, fill=ink)
    draw.line((120, 246, IMAGE_WIDTH - 120, 246), fill=accent, width=5)

    section_font = fitted_font(
        draw,
        page_data["section"],
        scenario["language"],
        44,
        34,
        IMAGE_WIDTH - 224,
        True,
    )
    draw.text((112, 286), page_data["section"], font=section_font, fill=accent)

    description_font = font(scenario["language"], 29)
    price_font = font(scenario["language"], 30, True)
    y = 390
    for index, dish_data in enumerate(page_data["dishes"]):
        name_font = fitted_font(
            draw,
            dish_data["name"],
            scenario["language"],
            39,
            30,
            IMAGE_WIDTH - 390,
            True,
        )
        draw.text((112, y), dish_data["name"], font=name_font, fill=ink)
        price_width = draw.textlength(dish_data["price"], font=price_font)
        draw.text((IMAGE_WIDTH - 112 - price_width, y + 4), dish_data["price"], font=price_font, fill=accent)
        y += 66
        for line in wrap_text(draw, dish_data["description"], description_font, IMAGE_WIDTH - 224):
            draw.text((112, y), line, font=description_font, fill=secondary_ink)
            y += 43
        y += 54
        if index < len(page_data["dishes"]) - 1:
            draw.line((112, y, IMAGE_WIDTH - 112, y), fill=divider, width=2)
            y += 58

    footer_font = fitted_font(
        draw,
        FOOTERS[scenario["language"]],
        scenario["language"],
        24,
        18,
        IMAGE_WIDTH - 224,
    )
    draw.line((112, IMAGE_HEIGHT - 188, IMAGE_WIDTH - 112, IMAGE_HEIGHT - 188), fill=divider, width=2)
    draw.text((112, IMAGE_HEIGHT - 150), FOOTERS[scenario["language"]], font=footer_font, fill=(96, 103, 101))
    return image


def apply_quality(image: Image.Image, quality: str) -> Image.Image:
    if quality == "clear":
        return image
    if quality == "poor":
        blurred = image.filter(ImageFilter.GaussianBlur(10.5))
        muted = ImageEnhance.Contrast(blurred).enhance(0.46)
        return ImageEnhance.Brightness(muted).enhance(0.92)
    if quality == "cropped":
        crop = image.crop((155, 118, IMAGE_WIDTH - 38, IMAGE_HEIGHT - 52))
        return crop.resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.LANCZOS)
    if quality == "partial_glare":
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        draw.polygon(
            [(520, 0), (730, 0), (1150, IMAGE_HEIGHT), (905, IMAGE_HEIGHT)],
            fill=(255, 255, 255, 168),
        )
        draw.polygon(
            [(0, 1060), (300, 920), (470, IMAGE_HEIGHT), (0, IMAGE_HEIGHT)],
            fill=(38, 43, 47, 220),
        )
        return Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    raise ValueError(f"Unknown quality variant: {quality}")


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


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def profile_for(scenario: dict[str, Any]) -> dict[str, Any]:
    case_id = scenario["id"]
    return {
        "id": f"profile-{case_id.lower()}",
        "name": "Multi-page diagnostic profile",
        "preferredLanguage": scenario["preferredLanguage"],
        "restaurantLanguage": scenario["language"],
        "allergies": [
            {
                "id": f"{case_id.lower()}-allergy-{index + 1}",
                **allergy_data,
            }
            for index, allergy_data in enumerate(scenario["allergies"])
        ],
    }


def page_expectation(page_data: dict[str, Any], page_number: int) -> dict[str, Any]:
    quality = QUALITY_EXPECTATIONS[page_data["quality"]]
    return {
        "pageNumber": page_number,
        "readability": {
            "allowedValues": quality["allowedValues"],
            "needsRetake": quality["needsRetake"],
        },
        "issues": quality["issues"],
        "contentLabels": page_data["contentLabels"],
        "dishNames": [dish_data["name"] for dish_data in page_data["dishes"]],
    }


def legacy_expected(scenario: dict[str, Any]) -> dict[str, Any]:
    risk_targets = [dish for dish in scenario["dishes"] if dish["role"] == "risk_target"]
    benign_dishes = [dish["dishName"] for dish in scenario["dishes"] if dish["role"] == "benign_control"]
    return {
        "readability": scenario["aggregateReadability"],
        "minimumRisks": [
            {
                "dishName": dish["dishName"],
                "minimumRisk": dish["allowedRiskRange"]["minimum"],
                "directListed": dish["evidenceLabel"] == "confirmed_visible",
            }
            for dish in risk_targets
        ],
        "benignDishes": benign_dishes,
    }


def build_assets() -> tuple[dict[str, bytes], bytes, dict[str, Any]]:
    image_assets: dict[str, bytes] = {}
    cases: list[dict[str, Any]] = []

    for scenario in SCENARIOS:
        image_paths: list[str] = []
        image_hashes: list[str] = []
        for page_number, page_data in enumerate(scenario["pages"], start=1):
            relative_path = f"docs/ai-evals/images/multi-page/{scenario['id']}-p{page_number:02d}.jpg"
            image = apply_quality(
                render_page(scenario, page_data, page_number),
                page_data["quality"],
            )
            data = jpeg_bytes(image)
            image_assets[relative_path] = data
            image_paths.append(relative_path)
            image_hashes.append(sha256(data))

        cases.append(
            {
                "id": scenario["id"],
                "name": scenario["name"],
                "sourceType": "controlled",
                "split": "development_diagnostic",
                "diagnosticOnly": True,
                "critical": any(
                    allergy_data["severity"] == "severe"
                    for allergy_data in scenario["allergies"]
                ),
                "language": scenario["language"],
                "cuisine": scenario["cuisine"],
                "diagnosticScenarios": scenario["diagnosticScenarios"],
                "imagePaths": image_paths,
                "imageSha256s": image_hashes,
                "profile": profile_for(scenario),
                "expectations": {
                    "pages": [
                        page_expectation(page_data, page_number)
                        for page_number, page_data in enumerate(scenario["pages"], start=1)
                    ],
                    "overallRisk": {
                        "status": "diagnostic",
                        "allowedRiskRange": ordinal_risk_range(
                            "avoid_unless_confirmed",
                            "avoid_unless_confirmed",
                        ),
                        "note": "At least one readable page directly names a profile allergen or relevant derivative.",
                    },
                    "dishes": scenario["dishes"],
                },
                "expected": legacy_expected(scenario),
                "reviewStatus": "development_diagnostic_unreviewed",
            }
        )

    manifest = {
        "schemaVersion": "1.0.0",
        "corpusId": "sift-ai-multi-page-development-diagnostic-v1",
        "status": "development_diagnostic",
        "generatorPath": GENERATOR_PATH,
        "generation": {
            "imageWidth": IMAGE_WIDTH,
            "imageHeight": IMAGE_HEIGHT,
            "format": "JPEG",
            "quality": JPEG_QUALITY,
            "subsampling": 0,
            "deterministic": True,
            "caseCount": len(cases),
            "pageCount": len(image_assets),
        },
        "evidenceBoundary": {
            "holdout": False,
            "releaseAccuracyClaim": False,
            "note": "Controlled synthetic development diagnostics only; results must not be presented as public accuracy evidence.",
        },
        "cases": cases,
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    return image_assets, manifest_bytes, manifest


def validate_manifest(manifest: dict[str, Any], image_assets: dict[str, bytes]) -> None:
    cases = manifest["cases"]
    if len(cases) != EXPECTED_CASE_COUNT:
        raise AssertionError("The multi-page diagnostic corpus must contain exactly eight cases.")

    case_ids = [case["id"] for case in cases]
    if len(set(case_ids)) != len(case_ids):
        raise AssertionError("Multi-page case IDs must be unique.")

    all_paths = [image_path for case in cases for image_path in case["imagePaths"]]
    if len(set(all_paths)) != len(all_paths) or set(all_paths) != set(image_assets):
        raise AssertionError("Generated image paths must be unique and complete.")

    languages = {case["language"] for case in cases}
    if languages != REQUIRED_LANGUAGES:
        raise AssertionError("The corpus language coverage drifted from the seven required languages.")

    scenarios = {
        scenario_tag
        for case in cases
        for scenario_tag in case["diagnosticScenarios"]
    }
    if not REQUIRED_SCENARIOS.issubset(scenarios):
        raise AssertionError("The corpus no longer covers every required multi-page scenario.")

    for case in cases:
        page_count = len(case["imagePaths"])
        if page_count < 2 or page_count > 4:
            raise AssertionError(f"{case['id']} must contain two to four ordered pages.")
        if len(case["imageSha256s"]) != page_count:
            raise AssertionError(f"{case['id']} image hashes do not match its ordered pages.")
        if len(case["expectations"]["pages"]) != page_count:
            raise AssertionError(f"{case['id']} page expectations do not match its ordered pages.")
        expected_page_numbers = list(range(1, page_count + 1))
        actual_page_numbers = [page_item["pageNumber"] for page_item in case["expectations"]["pages"]]
        if actual_page_numbers != expected_page_numbers:
            raise AssertionError(f"{case['id']} page expectations are not in valid order.")

        dish_names = [dish["dishName"] for dish in case["expectations"]["dishes"]]
        if len(set(dish_names)) != len(dish_names):
            raise AssertionError(f"{case['id']} contains duplicate dish expectations.")
        for dish in case["expectations"]["dishes"]:
            page_numbers = dish["sourcePageNumbers"]
            if page_numbers != sorted(set(page_numbers)):
                raise AssertionError(f"{case['id']} has unordered or duplicate source page numbers.")
            if any(page_number not in expected_page_numbers for page_number in page_numbers):
                raise AssertionError(f"{case['id']} has an out-of-range dish source page.")
            allowed_range = dish["allowedRiskRange"]
            if allowed_range != ordinal_risk_range(allowed_range["minimum"], allowed_range["maximum"]):
                raise AssertionError(f"{case['id']} has a non-canonical allowed risk range.")

    if not any(len(case["imagePaths"]) == 4 for case in cases):
        raise AssertionError("At least one case must exercise the maximum four-page path.")


def write_assets(image_assets: dict[str, bytes], manifest_bytes: bytes) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    expected_names = {Path(relative_path).name for relative_path in image_assets}
    for stale_path in OUTPUT_DIR.glob("*.jpg"):
        if stale_path.name not in expected_names:
            stale_path.unlink()
    for relative_path, data in image_assets.items():
        destination = ROOT / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    MANIFEST_PATH.write_bytes(manifest_bytes)


def check_assets(image_assets: dict[str, bytes], manifest_bytes: bytes) -> None:
    expected_names = {Path(relative_path).name for relative_path in image_assets}
    actual_names = {path.name for path in OUTPUT_DIR.glob("*.jpg")} if OUTPUT_DIR.exists() else set()
    if actual_names != expected_names:
        raise AssertionError("Generated JPEG membership differs from the deterministic corpus definition.")
    for relative_path, expected_data in image_assets.items():
        actual_path = ROOT / relative_path
        if not actual_path.exists() or actual_path.read_bytes() != expected_data:
            raise AssertionError(f"Generated image is missing or non-deterministic: {relative_path}")
    if not MANIFEST_PATH.exists() or MANIFEST_PATH.read_bytes() != manifest_bytes:
        raise AssertionError("multi-page-cases.json is missing, non-canonical, or out of date.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="Write the deterministic corpus assets.")
    mode.add_argument("--check", action="store_true", help="Verify checked-in assets byte for byte.")
    args = parser.parse_args()

    image_assets, manifest_bytes, manifest = build_assets()
    validate_manifest(manifest, image_assets)
    if args.check:
        check_assets(image_assets, manifest_bytes)
        action = "Validated"
    else:
        write_assets(image_assets, manifest_bytes)
        check_assets(image_assets, manifest_bytes)
        action = "Generated"
    print(
        f"{action} {len(manifest['cases'])} multi-page cases and "
        f"{len(image_assets)} JPEG pages at {MANIFEST_PATH}."
    )


if __name__ == "__main__":
    main()
