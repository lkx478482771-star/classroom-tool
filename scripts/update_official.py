#!/usr/bin/env python3
import datetime
import hashlib
import io
import json
import pathlib
import sys
import urllib.request

import pdfplumber


ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "official.json"


def main():
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    source = data.get("source", {})
    url = source.get("calendarPdf")
    if not url:
        print("no calendarPdf source configured")
        return 1

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; AHU-student-toolkit/1.0)"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        content = response.read()

    pdf_sha = hashlib.sha256(content).hexdigest()
    changed = pdf_sha != source.get("pdfSha")
    source["pdfSha"] = pdf_sha
    source["lastChecked"] = datetime.date.today().isoformat()
    source["status"] = "ok"

    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = pdf.pages[0].extract_text() or ""
        lines = [
            line.strip()
            for line in text.splitlines()
            if ("2026" in line or "2027" in line) and any(ch.isdigit() for ch in line)
        ]
        source["extractedLineCount"] = len(lines)
        source["changed"] = bool(changed and lines)
    except Exception as exc:  # noqa: BLE001
        source["status"] = "extract_failed"
        source["extractError"] = str(exc)[:200]

    DATA_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("pdfSha=%s changed=%s status=%s" % (pdf_sha[:12], changed, source["status"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
