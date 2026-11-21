"""PII gate for production-derived captures: any text in hub2-faces/*.json matching email / phone / 8-digit id / RUC /
capitalised-name patterns that is NOT also present in the QA captures (hub2/*.json = UI chrome + seed data) or the dummy
vocabulary fails the build. Usage: python3 piiscan.py [dir]  -> exit 1 on hits"""
import json, glob, re, sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "hub2-faces")
DUMMY = set("Ana Luis María José Jo Valentina Sebastián Camila Fernanda Diego Lucía Maximiliano Alejandro Sofía Renzo Ximena Bartolomé Quispe García Fernández de Córdova Li Rodríguez Huamán Castañeda Villanueva Paz Montoya Villavicencio Echevarría Ruiz Ng".split())
def texts(f):
    d = json.load(open(f))  # unreadable or malformed = exception = gate fails
    out = [n.get("text", "") for n in d["nodes"] if n.get("k") == "text"] + [l.get("text", "") for l in d.get("links", [])] + [l.get("href", "") for l in d.get("links", [])] + [d.get("title", ""), d.get("route", "")]
    out += [str(n.get(k, "")) for n in d["nodes"] for k in ("src", "id", "cls", "name", "alt") if n.get(k) and not str(n.get(k)).startswith("data:")]  # ids, classes, image urls carry record data too
    if d.get("trigger"): out.append(d["trigger"].get("text", ""))
    return out
known = set()
for f in glob.glob(os.path.join(HERE, "hub2", "*.json")):
    if f.endswith(("tree.json", "states.json", "overlays.json")) or "components" in f: continue
    known.update(t.strip().lower() for t in texts(f))
RX = {"email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "phone": re.compile(r"(\+51|\b9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b)"), "id8": re.compile(r"\b\d{8}\b"), "ruc": re.compile(r"\b(10|20)\d{9}\b"),
      "caps": re.compile(r"\b[A-ZÁÉÍÓÚÑ]{2,}(\s+[A-ZÁÉÍÓÚÑ.]{2,}){1,4}\b"), "name": re.compile(r"\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+(?:de|del|la|y\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4}\b"), "uuid": re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")}
SAFE = {"a@b.co", "jo@x.io", "+51 987 654 321", "+1 (415) 555-0199", "987654321", "FACES SCULPTORS"}  # the tenant's own brand name is not PII
LOREM = set("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim minim veniam quis nostrud exercitation ullamco laboris nisi aliquip commodo consequat".split())
PRODUCT_WORDS = set("limpieza facial botox 50u x ácido hialurónico labios 1 ml peeling químico medio consulta tratamiento láser co2 fraccionado rostro completo crema spf 50 vitamina c sérum 30".split())
hits = []
VOCAB = {w.lower() for w in DUMMY} | LOREM | PRODUCT_WORDS | {"de", "del", "la", "y"}
SAFE_RX = re.compile(r"(?:[\w.+-]+@(?:example\.com|b\.co|x\.io|clinica-ejemplo\.com\.pe)|\+51 987 654 321|\+1 \(415\) 555-0199|987654321|id-[0-9a-f]{6})")
def foreign(span):  # a matched span is a hit only if some token is not dummy vocabulary / known UI text
    toks = [re.sub(r"[.,;:()]", "", w) for w in re.split(r"\s+", span) if w]
    return any(w and w.lower() not in VOCAB and w.lower() not in known for w in toks)
for f in sorted(glob.glob(os.path.join(D, "*.json"))):
    if f.endswith("tree.json"): continue
    for t in texts(f):
        t = t.strip()
        if not t or t.lower() in known or t in SAFE: continue
        for k, rx in RX.items():
            if k in ("uuid", "id8", "ruc") and t.startswith("/"): continue  # record ids in hrefs never reach the master (FACES frames store no nav links)

            found = False
            for m in rx.finditer(t):  # match on the ORIGINAL text; dummy values are excused per span, never stripped beforehand
                span = m.group(0)
                if SAFE_RX.fullmatch(span): continue  # only an exact dummy value is excused
                if k == "id8" and re.search(r"[A-Z]{2,5}-$", t[:m.start()]): continue  # this span is an internal code like ITM-05658251
                if k == "caps" and re.search(r"\b(AND|THE|OF|TO|HOW|WHAT|FOR|WITH|IN|ON|BY|CON|PARA|POR|SIN|TODOS|TODAS)\b", span): continue  # UI copy (no DE/LA/DEL: those sit inside real names)
                if k in ("caps", "name") and not foreign(span): continue
                found = True; break
            if found: hits.append((os.path.basename(f)[:40], k, t[:50])); break
print("PII gate:", len(hits), "hit(s)")
for h in hits[:40]: print("  ", h)
sys.exit(1 if hits else 0)
