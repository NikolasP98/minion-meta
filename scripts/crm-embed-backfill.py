#!/usr/bin/env python3
"""
Backfill script: Historia Clinica xlsx → agent_memories (pgvector)
One memory per patient, all fields embedded for flexible semantic search.
Org: FACES SCULPTORS (21e0601b)
"""

import os
import openpyxl
import requests
import json
import time
import uuid
from datetime import datetime, timezone

# ── Config ─────────────────────────────────────────────────────────────────
XLSX_PATH = "Historia Clinica (Respuestas).xlsx"
SUPABASE_URL = "https://gxvsaskbohavnurfvshr.supabase.co"
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]
ORG_ID = "21e0601b"
AGENT_ID = "crm"
CATEGORY = "client"
SOURCE = "crm"
BATCH_SIZE = 20  # embeddings per API call
# ───────────────────────────────────────────────────────────────────────────

def fmt(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d")
    if isinstance(val, float) and val == int(val):
        return str(int(val))
    return str(val).strip() or None

def g(row, idx):
    """Safe index access into row tuple."""
    return fmt(row[idx]) if idx < len(row) else None

def build_content(row):
    """Build rich text blob for embedding — all non-null fields included."""
    # v1 column indices
    nombre   = g(row, 2)  or g(row, 30)
    edad     = g(row, 3)  or g(row, 31)
    nac      = g(row, 4)  or g(row, 32)
    dni      = g(row, 5)  or g(row, 33)
    estado   = g(row, 6)  or g(row, 34)
    sexo     = g(row, 7)  or g(row, 35)
    fecha_nac_str = g(row, 8) or g(row, 36)
    telefono = g(row, 9)  or g(row, 37)
    distrito = g(row, 10) or g(row, 38)
    domicilio= g(row, 11) or g(row, 39)
    ocupacion= g(row, 12) or g(row, 40)
    como     = g(row, 13) or g(row, 41)
    motivo   = g(row, 14) or g(row, 42)
    alcohol  = g(row, 15)
    tabaco   = g(row, 16)
    actividad= g(row, 17)
    aliment  = g(row, 18)
    enf      = g(row, 19)
    cirugia  = g(row, 20)
    hosp     = g(row, 21)
    alergia  = g(row, 22)
    medic    = g(row, 23)
    med1     = g(row, 24)
    med2     = g(row, 25)
    med3     = g(row, 26)
    email    = g(row, 28) or g(row, 43)

    if not nombre:
        return None  # skip junk/empty rows

    parts = []
    parts.append(f"Cliente: {nombre}")
    if dni:       parts.append(f"DNI: {dni}")
    if edad:      parts.append(f"Edad: {edad}")
    if fecha_nac_str: parts.append(f"Nacimiento: {fecha_nac_str}")
    if sexo:     parts.append(f"Sexo: {sexo}")
    if estado:   parts.append(f"Estado civil: {estado}")
    if nac:      parts.append(f"Nacionalidad: {nac}")
    if ocupacion:parts.append(f"Ocupación: {ocupacion}")

    contact_parts = []
    if telefono:  contact_parts.append(f"Tel: {telefono}")
    if email:     contact_parts.append(f"Email: {email}")
    if distrito:  contact_parts.append(f"Distrito: {distrito}")
    if domicilio: contact_parts.append(f"Domicilio: {domicilio}")
    if contact_parts:
        parts.append(" | ".join(contact_parts))

    if como:   parts.append(f"Referencia: {como}")
    if motivo: parts.append(f"Motivo de consulta: {motivo}")

    lifestyle = []
    if alcohol:   lifestyle.append(f"Alcohol={alcohol}")
    if tabaco:    lifestyle.append(f"Tabaco={tabaco}")
    if actividad: lifestyle.append(f"Actividad física={actividad}")
    if aliment:   lifestyle.append(f"Alimentación={aliment}")
    if lifestyle:
        parts.append("Estilo de vida: " + ", ".join(lifestyle))

    medical = []
    if enf:     medical.append(f"Enfermedades/alergias={enf}")
    if cirugia: medical.append(f"Cirugías={cirugia}")
    if hosp:    medical.append(f"Hospitalización={hosp}")
    if alergia: medical.append(f"Alergias={alergia}")
    if medic:   medical.append(f"Medicación={medic}")
    for d in [med1, med2, med3]:
        if d: medical.append(f"Detalle: {d}")
    if medical:
        parts.append("Antecedentes: " + ", ".join(medical))

    return "\n".join(parts)

def embed_batch(texts):
    resp = requests.post(
        "https://openrouter.ai/api/v1/embeddings",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={"model": "openai/text-embedding-3-small", "input": texts},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return [d["embedding"] for d in sorted(data["data"], key=lambda x: x["index"])]

def upsert_memories(records):
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/agent_memories",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=records,
        timeout=30,
    )
    if resp.status_code not in (200, 201):
        print(f"  ⚠ Upsert error {resp.status_code}: {resp.text[:300]}")
    return resp.status_code

def main():
    print("📂 Loading xlsx...")
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"   {len(rows)} raw rows")

    # Build (content, source_id, metadata) per patient
    patients = []
    seen_ids = set()
    skipped = 0

    for i, row in enumerate(rows):
        if not row[0]:  # empty timestamp = blank row
            skipped += 1
            continue

        content = build_content(row)
        if not content:
            skipped += 1
            continue

        # DNI is the canonical client identifier — skip rows without it
        dni = fmt(row[5]) or fmt(row[33])
        if not dni:
            skipped += 1
            continue
        source_id = dni

        # deduplicate: same DNI = same person, keep first submission
        if source_id in seen_ids:
            skipped += 1
            continue
        seen_ids.add(source_id)

        # structured metadata for filtering/display
        meta = {
            "nombre": fmt(row[2]) or fmt(row[30]),
            "dni": dni,
            "telefono": fmt(row[9]) or fmt(row[37]),
            "email": fmt(row[28]) or fmt(row[43]),
            "edad": fmt(row[3]) or fmt(row[31]),
            "sexo": fmt(row[7]) or fmt(row[35]),
            "distrito": fmt(row[10]) or fmt(row[38]),
            "motivo": fmt(row[14]) or fmt(row[42]),
            "referencia": fmt(row[13]) or fmt(row[41]),
        }

        occurred_at = None
        if isinstance(row[0], datetime):
            occurred_at = row[0].replace(tzinfo=timezone.utc).isoformat()

        patients.append({
            "content": content,
            "source_id": source_id,
            "occurred_at": occurred_at,
            "metadata": meta,
        })

    print(f"   {len(patients)} valid patients | {skipped} skipped (empty/duplicate)")

    # Process in batches
    total = len(patients)
    inserted = 0

    for batch_start in range(0, total, BATCH_SIZE):
        batch = patients[batch_start:batch_start + BATCH_SIZE]
        texts = [p["content"] for p in batch]

        print(f"\n[{batch_start+1}–{min(batch_start+len(batch), total)}/{total}] Embedding {len(batch)} patients...", end="", flush=True)

        try:
            vectors = embed_batch(texts)
        except Exception as e:
            print(f" ⚠ embed error: {e} — retrying in 5s")
            time.sleep(5)
            try:
                vectors = embed_batch(texts)
            except Exception as e2:
                print(f" ✗ failed: {e2} — skipping batch")
                continue

        records = []
        for p, vec in zip(batch, vectors):
            records.append({
                "id": str(uuid.uuid4()),
                "org_id": ORG_ID,
                "agent_id": AGENT_ID,
                "category": CATEGORY,
                "source": SOURCE,
                "source_id": p["source_id"],
                "content": p["content"],
                "embedding": f"[{','.join(str(x) for x in vec)}]",
                "importance": 0.8,
                "occurred_at": p["occurred_at"],
                "metadata": p["metadata"],
            })

        status = upsert_memories(records)
        inserted += len(records)
        print(f" ✓ ({status})")

        # brief pause to avoid rate limits
        if batch_start + BATCH_SIZE < total:
            time.sleep(0.5)

    print(f"\n✅ Done. {inserted}/{total} patients upserted to agent_memories (org={ORG_ID})")

if __name__ == "__main__":
    main()
