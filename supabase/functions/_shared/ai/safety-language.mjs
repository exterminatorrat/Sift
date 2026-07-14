export const safetyLanguageVersion = "2026-07-14.3";

export const bannedSafetyPatterns = [
  /safe to eat/i,
  /safe option/i,
  /safe choice/i,
  /safe meal/i,
  /safe dish/i,
  /safe for (you|the user|this allergy)/i,
  /you can eat/i,
  /ok to eat/i,
  /probably fine/i,
  /\bguarantee(?:d|s|ing)?\b/i,
  /completely safe/i,
  /definitely safe/i,
  /no risk/i,
  /zero risk/i,
  /riskless/i,
  /nothing to worry about/i,
  /risk[- ]free/i,
  /allergen[- ]free/i,
  /seguro para comer/i,
  /completamente seguro/i,
  /sin riesgo/i,
  /sans danger/i,
  /aucun risque/i,
  /totalement s[ûu]r/i,
  /sicher zu essen/i,
  /kein risiko/i,
  /v[öo]llig sicher/i,
  /sicuro da mangiare/i,
  /nessun rischio/i,
  /completamente sicuro/i,
  /sem risco/i,
  /安全に食べられる|食べても安全|完全に安全|リスクはありません/iu,
  /먹어도 안전|완전히 안전|위험 없음|위험이 없습니다/iu,
  /可以安全食用|可安全食用|完全安全|没有风险|沒有風險/iu,
  /ปลอดภัยที่จะกิน|ปลอดภัยต่อการรับประทาน|ปลอดภัยอย่างสมบูรณ์|ไม่มีความเสี่ยง/iu,
  /an toàn để ăn|hoàn toàn an toàn|không có rủi ro/iu,
  /yemek için güvenli|tamamen güvenli|risk yok/iu,
  /安全に食べ/u,
  /絶対に安全/u,
  /リスクはありません/u,
  /안전하게 먹/u,
  /완전히 안전/u,
  /위험이 없습니다/u,
  /可以安全食用/u,
  /完全安全/u,
  /没有风险/u,
  /ปลอดภัยที่จะกิน/u,
  /ไม่มีความเสี่ยง/u,
  /ปลอดภัยอย่างแน่นอน/u,
  /an toàn để ăn/iu,
  /hoàn toàn an toàn/iu,
  /không có rủi ro/iu,
  /yemek için güvenli/iu,
  /tamamen güvenli/iu,
  /risk yok/iu,
  /bezpieczne do jedzenia/iu,
  /całkowicie bezpieczne/iu,
  /brak ryzyka/iu,
  /aman untuk dimakan/iu,
  /sepenuhnya aman/iu,
  /tidak ada risiko/iu,
  /veilig om te eten/iu,
  /volledig veilig/iu,
  /geen risico/iu
];

const conservativeUncertaintyMarkers = [
  "visible menu",
  "visible text",
  "confirm",
  "ask staff",
  "cannot verify",
  "cannot confirm",
  "not confirmed",
  "unclear",
  "uncertain",
  "cross-contact",
  "kitchen",
  "texto visible",
  "confirme",
  "pregunte al personal",
  "no se puede verificar",
  "contacto cruzado",
  "texte visible",
  "confirmez",
  "demandez au personnel",
  "ne peut pas vérifier",
  "contamination croisée",
  "sichtbar",
  "bestätigen",
  "personal fragen",
  "nicht überprüfen",
  "kreuzkontakt",
  "testo visibile",
  "confermare",
  "chiedere al personale",
  "non può verificare",
  "contatto incrociato",
  "texto visível",
  "confirmar",
  "pergunte à equipe",
  "não é possível verificar",
  "contato cruzado",
  "表示されているメニュー",
  "確認",
  "スタッフ",
  "確認できません",
  "交差接触",
  "보이는 메뉴",
  "확인",
  "직원",
  "검증할 수",
  "교차 접촉",
  "可见菜单文字",
  "可見菜單文字",
  "确认",
  "確認",
  "询问工作人员",
  "詢問工作人員",
  "无法核实",
  "無法核實",
  "交叉接触",
  "交叉接觸",
  "ข้อความเมนูที่มองเห็น",
  "ยืนยัน",
  "สอบถามพนักงาน",
  "ไม่สามารถตรวจสอบ",
  "การสัมผัสข้าม",
  "văn bản thực đơn nhìn thấy",
  "xác nhận",
  "hỏi nhân viên",
  "không thể xác minh",
  "tiếp xúc chéo",
  "görünür menü metni",
  "doğrulayın",
  "personele sorun",
  "doğrulanamaz",
  "çapraz temas",
  "表示",
  "確認",
  "スタッフ",
  "検証でき",
  "交差接触",
  "표시된",
  "확인",
  "직원",
  "확인할 수",
  "교차 접촉",
  "可见",
  "确认",
  "无法核实",
  "交叉接触",
  "可見",
  "確認",
  "無法核實",
  "交叉接觸",
  "ข้อความที่มองเห็น",
  "ยืนยัน",
  "สอบถามพนักงาน",
  "ไม่สามารถตรวจสอบ",
  "การสัมผัสข้าม",
  "văn bản thực đơn nhìn thấy",
  "xác nhận",
  "hỏi nhân viên",
  "không thể xác minh",
  "tiếp xúc chéo",
  "görünür menü metni",
  "doğrulayın",
  "personele sorun",
  "doğrulanamaz",
  "çapraz temas",
  "widoczny tekst menu",
  "potwierdź",
  "zapytaj personel",
  "nie można zweryfikować",
  "kontakt krzyżowy",
  "teks menu yang terlihat",
  "konfirmasi",
  "tanyakan kepada staf",
  "tidak dapat memverifikasi",
  "kontak silang",
  "zichtbare menutekst",
  "bevestig",
  "vraag het personeel",
  "kan niet verifiëren",
  "kruiscontact"
];

export function getSafetyLanguageFingerprintSource() {
  return JSON.stringify({
    version: safetyLanguageVersion,
    bannedPatterns: bannedSafetyPatterns.map(({ source, flags }) => ({ source, flags })),
    conservativeUncertaintyMarkers,
    rewriteSource: rewriteBannedSafetyLanguage.toString()
  });
}

export function rewriteBannedSafetyLanguage(value) {
  if (typeof value === "string") {
    return value
      .replace(/safe to eat/gi, "low risk based on visible menu text")
      .replace(/safe option/gi, "lower concern option based on visible menu text")
      .replace(/safe choice/gi, "lower concern choice based on visible menu text")
      .replace(/safe meal/gi, "lower concern meal based on visible menu text")
      .replace(/safe dish/gi, "lower concern dish based on visible menu text")
      .replace(/safe for (you|the user|this allergy)/gi, "low risk based on visible menu text")
      .replace(/you can eat/gi, "ask staff to confirm before ordering")
      .replace(/ok to eat/gi, "ask staff to confirm before ordering")
      .replace(/probably fine/gi, "low risk based on visible menu text, but confirm with staff")
      .replace(/\bguarantee(?:d|s|ing)?\b/gi, "confirm")
      .replace(/completely safe/gi, "low risk based on visible menu text")
      .replace(/definitely safe/gi, "low risk based on visible menu text")
      .replace(/no risk/gi, "no obvious risk based on visible menu text")
      .replace(/zero risk/gi, "no obvious risk based on visible menu text")
      .replace(/riskless/gi, "lower risk based on visible menu text")
      .replace(/risk[- ]free/gi, "lower risk based on visible menu text")
      .replace(/nothing to worry about/gi, "confirm details with staff before ordering")
      .replace(/allergen[- ]free/gi, "without the listed allergen based on available information")
      .replace(/seguro para comer/gi, "riesgo bajo según el texto visible del menú; confirme con el personal")
      .replace(/completamente seguro/gi, "riesgo bajo según el texto visible del menú")
      .replace(/sin riesgo/gi, "sin riesgo evidente según el texto visible del menú")
      .replace(/sans danger/gi, "risque faible selon le texte visible du menu; confirmez avec le personnel")
      .replace(/aucun risque/gi, "aucun risque évident selon le texte visible du menu")
      .replace(/totalement s[ûu]r/gi, "risque faible selon le texte visible du menu")
      .replace(/sicher zu essen/gi, "geringes Risiko laut sichtbarem Menütext; beim Personal bestätigen")
      .replace(/kein risiko/gi, "kein offensichtliches Risiko laut sichtbarem Menütext")
      .replace(/v[öo]llig sicher/gi, "geringes Risiko laut sichtbarem Menütext")
      .replace(/sicuro da mangiare/gi, "rischio basso in base al testo visibile del menu; confermare con il personale")
      .replace(/nessun rischio/gi, "nessun rischio evidente in base al testo visibile del menu")
      .replace(/completamente sicuro/gi, "rischio basso in base al testo visibile del menu")
      .replace(/sem risco/gi, "sem risco evidente com base no texto visível do menu")
      .replace(/安全に食べられる|食べても安全|完全に安全|リスクはありません/giu, "表示されているメニュー文に基づく低リスクですが、スタッフに確認してください")
      .replace(/먹어도 안전|완전히 안전|위험 없음|위험이 없습니다/giu, "보이는 메뉴 문구 기준으로 위험이 낮지만 직원에게 확인하세요")
      .replace(/可以安全食用|可安全食用|完全安全|没有风险/giu, "根据可见菜单文字风险较低，请向工作人员确认")
      .replace(/可以安全食用|可安全食用|完全安全|沒有風險/giu, "根據可見菜單文字風險較低，請向工作人員確認")
      .replace(/ปลอดภัยที่จะกิน|ปลอดภัยต่อการรับประทาน|ปลอดภัยอย่างสมบูรณ์|ไม่มีความเสี่ยง/giu, "ความเสี่ยงต่ำตามข้อความเมนูที่มองเห็น โปรดยืนยันกับพนักงาน")
      .replace(/an toàn để ăn|hoàn toàn an toàn|không có rủi ro/giu, "nguy cơ thấp dựa trên văn bản thực đơn nhìn thấy; hãy xác nhận với nhân viên")
      .replace(/yemek için güvenli|tamamen güvenli|risk yok/giu, "görünür menü metnine göre düşük risk; personele doğrulatın")
      .replace(/安全に食べ/gu, "表示されたメニュー文では低リスクですが、スタッフに確認してください")
      .replace(/絶対に安全/gu, "表示されたメニュー文では低リスク")
      .replace(/リスクはありません/gu, "表示されたメニュー文では明らかなリスクは見つかりません")
      .replace(/안전하게 먹/gu, "표시된 메뉴 문구상 위험이 낮지만 직원에게 확인하세요")
      .replace(/완전히 안전/gu, "표시된 메뉴 문구상 위험이 낮음")
      .replace(/위험이 없습니다/gu, "표시된 메뉴 문구상 명백한 위험이 발견되지 않음")
      .replace(/可以安全食用/gu, "根据可见菜单文字风险较低，请向工作人员确认")
      .replace(/完全安全/gu, "根据可见菜单文字风险较低")
      .replace(/没有风险/gu, "根据可见菜单文字未发现明显风险")
      .replace(/ปลอดภัยที่จะกิน/gu, "ความเสี่ยงต่ำตามข้อความเมนูที่มองเห็น โปรดยืนยันกับพนักงาน")
      .replace(/ไม่มีความเสี่ยง/gu, "ไม่พบความเสี่ยงที่ชัดเจนจากข้อความเมนูที่มองเห็น")
      .replace(/ปลอดภัยอย่างแน่นอน/gu, "ความเสี่ยงต่ำตามข้อความเมนูที่มองเห็น")
      .replace(/an toàn để ăn/giu, "nguy cơ thấp dựa trên văn bản thực đơn nhìn thấy; hãy xác nhận với nhân viên")
      .replace(/hoàn toàn an toàn/giu, "nguy cơ thấp dựa trên văn bản thực đơn nhìn thấy")
      .replace(/không có rủi ro/giu, "không thấy nguy cơ rõ ràng trong văn bản thực đơn nhìn thấy")
      .replace(/yemek için güvenli/giu, "görünür menü metnine göre düşük risk; personele doğrulatın")
      .replace(/tamamen güvenli/giu, "görünür menü metnine göre düşük risk")
      .replace(/risk yok/giu, "görünür menü metninde belirgin bir risk görülmedi")
      .replace(/bezpieczne do jedzenia/giu, "niskie ryzyko na podstawie widocznego tekstu menu; potwierdź z personelem")
      .replace(/całkowicie bezpieczne/giu, "niskie ryzyko na podstawie widocznego tekstu menu")
      .replace(/brak ryzyka/giu, "brak widocznego ryzyka na podstawie tekstu menu")
      .replace(/aman untuk dimakan/giu, "risiko rendah berdasarkan teks menu yang terlihat; konfirmasikan dengan staf")
      .replace(/sepenuhnya aman/giu, "risiko rendah berdasarkan teks menu yang terlihat")
      .replace(/tidak ada risiko/giu, "tidak ada risiko yang terlihat dari teks menu yang terlihat")
      .replace(/veilig om te eten/giu, "laag risico op basis van zichtbare menutekst; bevestig dit bij het personeel")
      .replace(/volledig veilig/giu, "laag risico op basis van zichtbare menutekst")
      .replace(/geen risico/giu, "geen duidelijk risico gevonden in de zichtbare menutekst");
  }

  if (Array.isArray(value)) {
    return value.map(rewriteBannedSafetyLanguage);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "uri" ? item : rewriteBannedSafetyLanguage(item)
      ])
    );
  }

  return value;
}

export function containsBannedSafetyLanguage(value) {
  if (typeof value === "string") {
    return bannedSafetyPatterns.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some(containsBannedSafetyLanguage);
  }

  if (isRecord(value)) {
    return Object.entries(value).some(
      ([key, item]) => key !== "uri" && containsBannedSafetyLanguage(item)
    );
  }

  return false;
}

export function hasConservativeUncertaintyText(value) {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  return conservativeUncertaintyMarkers.some((phrase) => text.includes(phrase));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
