/**
 * BJS-specific parser: extract food data from BJS product page HTML using DOMParser.
 * SVG nutrition label: tspan siblings for serving size/calories; text-anchor="start" + regex for nutrients.
 */

export type ParsedBjsFood = {
  brand: string;
  productName: string;
  imageUrl: string;
  servingSize: string;
  servingGrams: number | null;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  addedSugar: number | null;
  sodium: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  cholesterol: number | null;
  potassium: number | null;
  ingredients: string;
};

const empty: ParsedBjsFood = {
  brand: "",
  productName: "",
  imageUrl: "",
  servingSize: "",
  servingGrams: null,
  calories: null,
  carbs: null,
  protein: null,
  fat: null,
  fiber: null,
  sugar: null,
  addedSugar: null,
  sodium: null,
  saturatedFat: null,
  transFat: null,
  cholesterol: null,
  potassium: null,
  ingredients: "",
};

function parseNumFromText(text: string): number | null {
  const match = text.replace(/,/g, "").match(/[\d.]+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse grams from serving size string.
 * Handles "1 packet 43g", "1 packet  43g (43.0g)", "1/2 cup dry (40g)".
 */
function parseGramsFromServingSize(servingSize: string): number | null {
  const cleaned = servingSize.replace(/\s+/g, " ").trim();
  const parenMatch = cleaned.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  if (parenMatch) return Number(parenMatch[1]);
  const gMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (gMatch) return Number(gMatch[1]);
  return null;
}

/** Full text content of element and descendants (flattened). */
function getTextContent(el: Element): string {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      parts.push(node.textContent.trim());
    }
    node.childNodes.forEach(walk);
  };
  walk(el);
  return parts.join(" ").trim();
}

/** Next sibling element that matches tag name (e.g. "tspan"). */
function nextSiblingElement(el: Element, tagName: string): Element | null {
  const lower = tagName.toLowerCase();
  let next: Element | null = el.nextElementSibling;
  while (next) {
    if (next.tagName.toLowerCase() === lower) return next;
    next = next.nextElementSibling;
  }
  return null;
}

/** Map nutrient label to schema key */
function normalizeNutrientName(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes("total fat") || n === "fat") return "fat";
  if (n.includes("saturated")) return "saturatedFat";
  if (n.includes("trans fat")) return "transFat";
  if (n.includes("cholesterol")) return "cholesterol";
  if (n.includes("sodium")) return "sodium";
  if (n.includes("total carb") || n.includes("total carbohydrate")) return "carbs";
  if (n.includes("dietary fiber") || n === "fiber") return "fiber";
  if (n.includes("total sugar") || n === "sugar") return "sugar";
  if (n.includes("added sugar")) return "addedSugar";
  if (n.includes("protein")) return "protein";
  if (n.includes("potassium")) return "potassium";
  return "";
}

/** Value at end of nutrient line: number + unit (g, mg, mcg, %). */
const NUTRIENT_VALUE_REGEX = /\s(\d+(?:\.\d+)?(?:g|mg|mcg|%))$/i;

type NutritionSvgResult = {
  servingSize: string;
  servingGrams: number | null;
  calories: number | null;
  nutrients: Array<{ name: string; valueNum: number | null }>;
  ingredients: string;
};

/**
 * Parse the nutrition SVG (DOM).
 * - Serving size: tspan "Serving size" → value is next sibling tspan.
 * - Calories: tspan "Calories" → value is next sibling tspan.
 * - Nutrients: .nutrients text[text-anchor="start"], full text, regex for value at end.
 */
function parseNutritionSvg(svg: Element): NutritionSvgResult {
  const result: NutritionSvgResult = {
    servingSize: "",
    servingGrams: null,
    calories: null,
    nutrients: [],
    ingredients: "",
  };

  const allTspans = svg.querySelectorAll("tspan");

  // 1. Serving size: tspan "Serving size" → next sibling tspan
  for (const el of allTspans) {
    const text = getTextContent(el).toLowerCase();
    if (text === "serving size") {
      const next = nextSiblingElement(el, "tspan");
      if (next) {
        const valueText = getTextContent(next);
        if (valueText) {
          result.servingSize = valueText;
          result.servingGrams = parseGramsFromServingSize(valueText);
        }
      }
      break;
    }
  }

  // 2. Calories: tspan "Calories" → next sibling tspan
  for (const el of allTspans) {
    const text = getTextContent(el).toLowerCase();
    if (text === "calories") {
      const next = nextSiblingElement(el, "tspan");
      if (next) {
        const valueText = getTextContent(next);
        const num = parseNumFromText(valueText);
        if (num != null) result.calories = num;
      }
      break;
    }
  }

  // 3. Nutrients: .nutrients text[text-anchor="start"], full text, regex for value at end
  const nutrientsGrp = svg.querySelector("g.nutrients");
  if (nutrientsGrp) {
    const textEls = nutrientsGrp.querySelectorAll('text[text-anchor="start"]');
    for (const el of textEls) {
      const fullText = getTextContent(el);
      const cleaned = fullText.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
      if (!cleaned) continue;

      const match = cleaned.match(NUTRIENT_VALUE_REGEX);
      if (match && match.index !== undefined) {
        const valueNum = parseNumFromText(match[1]);
        const name = cleaned.slice(0, match.index).trim();
        result.nutrients.push({ name, valueNum });
      }
    }
  }

  // 4. Ingredients: .ingredients, text after "INGREDIENTS:"
  const ingredientsGrp = svg.querySelector("g.ingredients");
  if (ingredientsGrp) {
    const text = getTextContent(ingredientsGrp);
    const afterLabel = text.replace(/^INGREDIENTS:\s*/i, "").trim();
    if (afterLabel) result.ingredients = afterLabel;
  }

  return result;
}

/** Parse nutrition from raw SVG string (e.g. from Label Insight URL). Reuses same DOM logic. */
function parseNutritionSvgFromString(svgString: string): NutritionSvgResult {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.tagName?.toLowerCase() !== "svg") {
    return {
      servingSize: "",
      servingGrams: null,
      calories: null,
      nutrients: [],
      ingredients: "",
    };
  }
  return parseNutritionSvg(svg);
}

function mergeNutritionInto(out: ParsedBjsFood, parsed: NutritionSvgResult): void {
  out.servingSize = parsed.servingSize;
  out.servingGrams = parsed.servingGrams;
  out.calories = parsed.calories;
  out.ingredients = parsed.ingredients;
  for (const { name, valueNum } of parsed.nutrients) {
    const key = normalizeNutrientName(name);
    if (key === "fat") out.fat = valueNum;
    else if (key === "saturatedFat") out.saturatedFat = valueNum;
    else if (key === "transFat") out.transFat = valueNum;
    else if (key === "cholesterol") out.cholesterol = valueNum;
    else if (key === "sodium") out.sodium = valueNum;
    else if (key === "carbs") out.carbs = valueNum;
    else if (key === "fiber") out.fiber = valueNum;
    else if (key === "sugar") out.sugar = valueNum;
    else if (key === "addedSugar") out.addedSugar = valueNum;
    else if (key === "protein") out.protein = valueNum;
    else if (key === "potassium") out.potassium = valueNum;
  }
}

/**
 * Parse BJS product HTML. Handles both inline SVGs and external Label Insight SVGs.
 * - Inline: looks for `svg` with `.header` or `.nutrients`, parses in-place.
 * - External: if no inline SVG, looks for `object.li-nfp[data="..."]`; if
 *   `fetchExternalSvg(url)` is provided, fetches that URL server-side and parses the returned SVG.
 */
export async function parseBjsFoodHtml(
  html: string,
  fetchExternalSvg?: (url: string) => Promise<string>,
): Promise<ParsedBjsFood> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: ParsedBjsFood = { ...empty };

  const brandEl = doc.querySelector('a.shopbrand .brand-name');
  if (brandEl) out.brand = (brandEl.textContent ?? "").trim();

  const nameEl = doc.querySelector('[auto-data="product_name"]');
  if (nameEl) out.productName = (nameEl.textContent ?? "").trim();

  const img = doc.querySelector("figure img");
  const src = img?.getAttribute("src");
  if (src) out.imageUrl = src.trim();

  // 1. Inline SVG: look for svg with .header or .nutrients
  const inlineSvg = doc.querySelector("svg");
  const hasUsableInlineSvg =
    inlineSvg &&
    (inlineSvg.querySelector("g.header") || inlineSvg.querySelector("g.nutrients"));

  if (hasUsableInlineSvg) {
    const parsed = parseNutritionSvg(inlineSvg!);
    mergeNutritionInto(out, parsed);
  } else {
    // 2. External SVG: object.li-nfp with data URL (Label Insight)
    const objectEl = doc.querySelector('object.li-nfp[data]');
    const externalUrl = objectEl?.getAttribute("data")?.trim();

    if (externalUrl && fetchExternalSvg) {
      const svgString = await fetchExternalSvg(externalUrl);
      const parsed = parseNutritionSvgFromString(svgString);
      mergeNutritionInto(out, parsed);
    }
  }

  if (out.calories == null) {
    const body = doc.body?.textContent ?? "";
    const calMatch = body.match(/\b(\d+)\s*calories?\b/i);
    if (calMatch) out.calories = Number(calMatch[1]);
  }

  return out;
}
