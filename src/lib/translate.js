const SEP = ' @@@ ';

export async function translateStepsToSpanish(steps) {
  if (!steps?.length) return steps;
  try {
    const joined = steps.join(SEP);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(joined)}`;
    const res  = await fetch(url);
    const json = await res.json();
    const translated = json[0]?.map(chunk => chunk[0]).join('') ?? joined;
    return translated.split(SEP).map(s => s.trim()).filter(Boolean);
  } catch {
    return steps;
  }
}
