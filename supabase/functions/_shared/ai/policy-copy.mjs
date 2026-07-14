export const policyCopyVersion = "2026-07-13.1";

const copyByLanguage = Object.freeze({
  en: Object.freeze({
    low_risk: "Low risk based on visible menu text; confirm with staff.",
    ask_staff: "Possible hidden or preparation risk. Ask staff before ordering.",
    high_risk: "High risk based on menu evidence. Confirm with staff before ordering.",
    avoid_unless_confirmed: "Avoid unless staff can clearly confirm ingredients and preparation.",
    unclear: "Not enough information. Retake the photo or ask staff directly."
  }),
  es: Object.freeze({
    low_risk: "Riesgo bajo según el texto visible del menú; confirme con el personal.",
    ask_staff: "Posible riesgo oculto o de preparación; pregunte al personal antes de pedir.",
    high_risk: "Riesgo alto según la evidencia del menú; confirme con el personal antes de pedir.",
    avoid_unless_confirmed: "Evite este plato a menos que el personal confirme claramente los ingredientes y la preparación.",
    unclear: "No hay suficiente información; vuelva a tomar la foto o pregunte directamente al personal."
  }),
  fr: Object.freeze({
    low_risk: "Risque faible selon le texte visible du menu; confirmez avec le personnel.",
    ask_staff: "Risque caché ou lié à la préparation possible; demandez au personnel avant de commander.",
    high_risk: "Risque élevé selon les éléments du menu; confirmez avec le personnel avant de commander.",
    avoid_unless_confirmed: "Évitez ce plat sauf si le personnel peut confirmer clairement les ingrédients et la préparation.",
    unclear: "Informations insuffisantes; reprenez la photo ou demandez directement au personnel."
  }),
  de: Object.freeze({
    low_risk: "Geringes Risiko laut sichtbarem Menütext; beim Personal bestätigen.",
    ask_staff: "Mögliches verborgenes oder zubereitungsbedingtes Risiko; vor der Bestellung das Personal fragen.",
    high_risk: "Hohes Risiko laut Menühinweisen; vor der Bestellung beim Personal bestätigen.",
    avoid_unless_confirmed: "Meiden, sofern das Personal Zutaten und Zubereitung nicht eindeutig bestätigen kann.",
    unclear: "Nicht genügend Informationen; Foto erneut aufnehmen oder das Personal direkt fragen."
  }),
  it: Object.freeze({
    low_risk: "Rischio basso in base al testo visibile del menu; confermare con il personale.",
    ask_staff: "Possibile rischio nascosto o legato alla preparazione; chiedere al personale prima di ordinare.",
    high_risk: "Rischio elevato in base alle informazioni del menu; confermare con il personale prima di ordinare.",
    avoid_unless_confirmed: "Evitare a meno che il personale possa confermare chiaramente ingredienti e preparazione.",
    unclear: "Informazioni insufficienti; scattare di nuovo la foto o chiedere direttamente al personale."
  }),
  pt: Object.freeze({
    low_risk: "Risco baixo com base no texto visível do menu; confirmar com a equipe.",
    ask_staff: "Possível risco oculto ou de preparo; pergunte à equipe antes de pedir.",
    high_risk: "Risco alto com base nas informações do menu; confirmar com a equipe antes de pedir.",
    avoid_unless_confirmed: "Evite, a menos que a equipe possa confirmar claramente os ingredientes e o preparo.",
    unclear: "Informações insuficientes; tire outra foto ou pergunte diretamente à equipe."
  }),
  ja: Object.freeze({
    low_risk: "表示されたメニュー文では低リスクですが、スタッフに確認してください。",
    ask_staff: "隠れた材料や調理方法の可能性があります。注文前にスタッフへ確認してください。",
    high_risk: "メニュー情報から高いリスクが考えられます。注文前にスタッフへ確認してください。",
    avoid_unless_confirmed: "材料と調理方法をスタッフが明確に確認できない限り、避けてください。",
    unclear: "情報が不足しています。写真を撮り直すか、スタッフへ直接確認してください。"
  }),
  ko: Object.freeze({
    low_risk: "표시된 메뉴 문구상 위험이 낮지만 직원에게 확인하세요.",
    ask_staff: "숨은 재료나 조리 과정의 위험 가능성이 있습니다. 주문 전에 직원에게 확인하세요.",
    high_risk: "메뉴 정보상 알레르기 위험이 높습니다. 주문 전에 직원에게 확인하세요.",
    avoid_unless_confirmed: "직원이 재료와 조리 과정을 명확히 확인해 주지 못하면 피하세요.",
    unclear: "정보가 충분하지 않습니다. 사진을 다시 찍거나 직원에게 직접 확인하세요."
  }),
  "zh-hans": Object.freeze({
    low_risk: "根据可见菜单文字风险较低，请向工作人员确认。",
    ask_staff: "可能存在隐藏配料或烹饪风险，点餐前请询问工作人员。",
    high_risk: "根据菜单信息，过敏原风险较高；点餐前请向工作人员确认。",
    avoid_unless_confirmed: "除非工作人员能明确确认配料和制作方式，否则请避免点此菜。",
    unclear: "信息不足，请重新拍照或直接询问工作人员。"
  }),
  "zh-hant": Object.freeze({
    low_risk: "根據可見菜單文字風險較低，請向工作人員確認。",
    ask_staff: "可能存在隱藏配料或烹調風險，點餐前請詢問工作人員。",
    high_risk: "根據菜單資訊，過敏原風險較高；點餐前請向工作人員確認。",
    avoid_unless_confirmed: "除非工作人員能明確確認配料和製作方式，否則請避免點此菜。",
    unclear: "資訊不足，請重新拍照或直接詢問工作人員。"
  }),
  th: Object.freeze({
    low_risk: "ความเสี่ยงต่ำตามข้อความเมนูที่มองเห็น โปรดยืนยันกับพนักงาน",
    ask_staff: "อาจมีความเสี่ยงจากส่วนผสมแฝงหรือวิธีปรุง โปรดสอบถามพนักงานก่อนสั่ง",
    high_risk: "มีความเสี่ยงสูงตามข้อมูลในเมนู โปรดยืนยันกับพนักงานก่อนสั่ง",
    avoid_unless_confirmed: "ควรหลีกเลี่ยง เว้นแต่พนักงานจะยืนยันส่วนผสมและวิธีปรุงได้อย่างชัดเจน",
    unclear: "ข้อมูลไม่เพียงพอ โปรดถ่ายภาพใหม่หรือสอบถามพนักงานโดยตรง"
  }),
  vi: Object.freeze({
    low_risk: "Nguy cơ thấp dựa trên văn bản thực đơn nhìn thấy; hãy xác nhận với nhân viên.",
    ask_staff: "Có thể có nguy cơ từ nguyên liệu ẩn hoặc cách chế biến; hãy hỏi nhân viên trước khi gọi món.",
    high_risk: "Nguy cơ cao dựa trên thông tin trong thực đơn; hãy xác nhận với nhân viên trước khi gọi món.",
    avoid_unless_confirmed: "Hãy tránh món này trừ khi nhân viên có thể xác nhận rõ nguyên liệu và cách chế biến.",
    unclear: "Không đủ thông tin; hãy chụp lại ảnh hoặc hỏi trực tiếp nhân viên."
  }),
  tr: Object.freeze({
    low_risk: "Görünür menü metnine göre düşük risk; personele doğrulatın.",
    ask_staff: "Gizli içerik veya hazırlama riski olabilir; sipariş vermeden önce personele sorun.",
    high_risk: "Menü bilgilerine göre yüksek risk; sipariş vermeden önce personele doğrulatın.",
    avoid_unless_confirmed: "Personel içerikleri ve hazırlama şeklini açıkça doğrulamadıkça bu yemekten kaçının.",
    unclear: "Yeterli bilgi yok; fotoğrafı yeniden çekin veya personele doğrudan sorun."
  }),
  pl: Object.freeze({
    low_risk: "Niskie ryzyko na podstawie widocznego tekstu menu; potwierdź z personelem.",
    ask_staff: "Możliwe ryzyko ukrytych składników lub sposobu przygotowania; zapytaj personel przed zamówieniem.",
    high_risk: "Wysokie ryzyko na podstawie informacji w menu; potwierdź z personelem przed zamówieniem.",
    avoid_unless_confirmed: "Unikaj tego dania, chyba że personel jasno potwierdzi składniki i sposób przygotowania.",
    unclear: "Za mało informacji; zrób zdjęcie ponownie lub zapytaj personel bezpośrednio."
  }),
  id: Object.freeze({
    low_risk: "Risiko rendah berdasarkan teks menu yang terlihat; konfirmasikan dengan staf.",
    ask_staff: "Mungkin ada risiko bahan tersembunyi atau cara penyiapan; tanyakan kepada staf sebelum memesan.",
    high_risk: "Risiko tinggi berdasarkan informasi menu; konfirmasikan dengan staf sebelum memesan.",
    avoid_unless_confirmed: "Hindari kecuali staf dapat mengonfirmasi bahan dan cara penyiapan dengan jelas.",
    unclear: "Informasi tidak cukup; ambil ulang foto atau tanyakan langsung kepada staf."
  }),
  nl: Object.freeze({
    low_risk: "Laag risico op basis van zichtbare menutekst; bevestig dit bij het personeel.",
    ask_staff: "Mogelijk risico door verborgen ingrediënten of bereiding; vraag het personeel vóór het bestellen.",
    high_risk: "Hoog risico op basis van de menu-informatie; bevestig dit bij het personeel vóór het bestellen.",
    avoid_unless_confirmed: "Vermijd dit gerecht tenzij het personeel de ingrediënten en bereiding duidelijk kan bevestigen.",
    unclear: "Onvoldoende informatie; maak opnieuw een foto of vraag het personeel rechtstreeks."
  })
});

const languageAliases = Object.freeze({
  english: "en", en: "en",
  spanish: "es", espanol: "es", "español": "es", es: "es",
  french: "fr", francais: "fr", "français": "fr", fr: "fr",
  german: "de", deutsch: "de", de: "de",
  italian: "it", italiano: "it", it: "it",
  portuguese: "pt", portugues: "pt", "português": "pt", pt: "pt",
  japanese: "ja", "日本語": "ja", ja: "ja",
  korean: "ko", "한국어": "ko", ko: "ko",
  "chinese simplified": "zh-hans", "simplified chinese": "zh-hans", "简体中文": "zh-hans", "zh-hans": "zh-hans",
  "chinese traditional": "zh-hant", "traditional chinese": "zh-hant", "繁體中文": "zh-hant", "zh-hant": "zh-hant",
  thai: "th", "ไทย": "th", th: "th",
  vietnamese: "vi", "tiếng việt": "vi", vi: "vi",
  turkish: "tr", "türkçe": "tr", tr: "tr",
  polish: "pl", polski: "pl", pl: "pl",
  indonesian: "id", "bahasa indonesia": "id", id: "id",
  dutch: "nl", nederlands: "nl", nl: "nl"
});

export function policyMessageForRisk(riskLevel, language) {
  const languageKey = resolvePolicyLanguage(language);
  return copyByLanguage[languageKey]?.[riskLevel] ?? copyByLanguage.en[riskLevel] ?? copyByLanguage.en.unclear;
}

export function getPolicyCopyFingerprintSource() {
  return JSON.stringify({ version: policyCopyVersion, copyByLanguage, languageAliases });
}

function resolvePolicyLanguage(language) {
  const normalized = String(language ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim();
  return languageAliases[normalized] ?? "en";
}
