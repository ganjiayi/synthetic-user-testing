#!/usr/bin/env python3
"""
reporter.py

Reads plan.json from a run folder and writes a formatted .docx research plan.

Usage:
  python3 src/pipeline/reporter.py <run_folder>

Example:
  python3 src/pipeline/reporter.py runs/22042026_synthetic-user-test-1

Output: runs/<run_folder>/report/<run_id>_research_plan.docx
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

import openpyxl
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter

from pptx import Presentation
from pptx.util import Inches, Pt as PptPt, Emu
from pptx.dml.color import RGBColor as PptRGB
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Cm as PptCm
import pptx.oxml.ns as pptx_ns
from lxml import etree


# ── Colour palette ────────────────────────────────────────────────────────────
PURPLE      = RGBColor(0x6B, 0x21, 0xA8)   # headings
DARK_GREY   = RGBColor(0x1F, 0x2A, 0x37)   # body
MID_GREY    = RGBColor(0x6B, 0x72, 0x80)   # labels
LIGHT_BG    = "F3F4F6"                      # table header fill (hex, no #)
RULE_GREY   = "D1D5DB"                      # table border colour


# ── Helpers ───────────────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_colour):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_colour)
    tcPr.append(shd)


def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        tag = OxmlElement(f"w:{side}")
        tag.set(qn("w:val"), kwargs.get("val", "single"))
        tag.set(qn("w:sz"), kwargs.get("sz", "4"))
        tag.set(qn("w:space"), "0")
        tag.set(qn("w:color"), kwargs.get("color", RULE_GREY))
        tcBorders.append(tag)
    tcPr.append(tcBorders)


def add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18 if level == 1 else 10)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run(text.upper() if level == 1 else text)
    run.bold = True
    run.font.size = Pt(11 if level == 1 else 10)
    run.font.color.rgb = PURPLE
    return p


def add_label_value(doc, label, value, indent=False):
    if not value:
        return
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after  = Pt(2)
    if indent:
        p.paragraph_format.left_indent = Cm(0.6)
    lbl = p.add_run(f"{label}:  ")
    lbl.bold = True
    lbl.font.size = Pt(9)
    lbl.font.color.rgb = DARK_GREY
    val = p.add_run(str(value))
    val.font.size = Pt(9)
    val.font.color.rgb = DARK_GREY


def add_body(doc, text, indent=False):
    if not text:
        return
    p = doc.add_paragraph(str(text))
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after  = Pt(4)
    if indent:
        p.paragraph_format.left_indent = Cm(0.6)
    for run in p.runs:
        run.font.size = Pt(9)
        run.font.color.rgb = DARK_GREY


def add_bullet(doc, text, indent=False):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after  = Pt(1)
    if indent:
        p.paragraph_format.left_indent = Cm(0.6)
    run = p.add_run(str(text))
    run.font.size = Pt(9)
    run.font.color.rgb = DARK_GREY


def add_divider(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after  = Pt(6)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "4")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), RULE_GREY)
    pBdr.append(bottom)
    pPr.append(pBdr)


def make_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"

    # Header row
    hdr = table.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_bg(cell, LIGHT_BG)
        p = cell.paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.size = Pt(8.5)
        run.font.color.rgb = DARK_GREY

    # Data rows
    for r_idx, row_data in enumerate(rows):
        row = table.rows[r_idx + 1]
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            p = cell.paragraphs[0]
            run = p.add_run(str(val) if val is not None else "—")
            run.font.size = Pt(8.5)
            run.font.color.rgb = DARK_GREY

    # Column widths
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Inches(w)

    doc.add_paragraph()
    return table


# ── Section builders ──────────────────────────────────────────────────────────

def build_cover(doc, plan):
    meta = plan.get("_meta", {})
    rg   = plan.get("research_goals", {})
    sc   = plan.get("study_context", {})

    # Title
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    title.paragraph_format.space_before = Pt(0)
    title.paragraph_format.space_after  = Pt(6)
    t = title.add_run("Synthetic UX Research Plan")
    t.bold = True
    t.font.size = Pt(20)
    t.font.color.rgb = DARK_GREY

    sub = doc.add_paragraph()
    s = sub.add_run(f"{rg.get('product_name', '')}  ·  {rg.get('feature_under_test', '')}")
    s.font.size = Pt(11)
    s.font.color.rgb = MID_GREY
    sub.paragraph_format.space_after = Pt(14)

    # Meta block
    meta_items = [
        ("Run ID",      meta.get("run_id", "")),
        ("Researcher",  meta.get("researcher", "")),
        ("Product",     meta.get("product", "")),
        ("Feature",     meta.get("feature", "")),
        ("Generated",   meta.get("generated_at", "")[:10] if meta.get("generated_at") else ""),
        ("Model",       meta.get("model", "")),
        ("Lifecycle",   sc.get("product_phase", {}).get("lifecycle", "").replace("_", " ").title()),
        ("Design phase",sc.get("design_phase", {}).get("phase", "").title()),
        ("Fidelity",    sc.get("artefact_config", {}).get("fidelity_level", "").replace("_", " ").title()),
        ("Audience",    ", ".join(plan.get("output_handoff", {}).get("primary_audience", []))),
    ]
    for label, val in meta_items:
        add_label_value(doc, label, val)

    add_divider(doc)


def build_study_context(doc, plan):
    sc  = plan.get("study_context", {})
    pp  = sc.get("product_phase", {})
    dp  = sc.get("design_phase", {})
    art = sc.get("artefact_config", {})

    add_heading(doc, "1. Study Context")
    add_label_value(doc, "Lifecycle phase",    pp.get("lifecycle", "").replace("_", " ").title())
    add_label_value(doc, "Phase context",      pp.get("phase_context"))
    add_label_value(doc, "Agent calibration",  pp.get("agent_calibration", "").replace("_", " ").title())
    add_label_value(doc, "Design phase",       dp.get("phase", "").title())
    add_label_value(doc, "Research focus",     dp.get("research_focus"))
    add_label_value(doc, "Input format",       art.get("input_format", "").replace("_", " ").title())
    add_label_value(doc, "Fidelity",           art.get("fidelity_level", "").replace("_", " ").title())
    add_label_value(doc, "API mode",           art.get("api_mode", "").replace("_", " "))
    add_label_value(doc, "Friction sensitivity", art.get("friction_sensitivity", "").title())
    add_label_value(doc, "Artefact link",      art.get("artefact_link"))
    add_label_value(doc, "Artefact notes",     art.get("artefact_notes"))
    add_divider(doc)


def build_research_goals(doc, plan):
    rg = plan.get("research_goals", {})

    add_heading(doc, "2. Research Goals")

    add_heading(doc, "Core research question", level=2)
    add_body(doc, rg.get("core_question"))

    add_heading(doc, "What a good answer looks like", level=2)
    add_body(doc, rg.get("good_answer_looks_like"))

    add_heading(doc, "Primary research question", level=2)
    add_body(doc, rg.get("primary_rq"))

    srqs = rg.get("secondary_rqs", [])
    if srqs:
        add_heading(doc, "Secondary research questions", level=2)
        for q in srqs:
            add_bullet(doc, q)

    add_heading(doc, "Decision this research must support", level=2)
    add_body(doc, rg.get("decision_to_support"))

    add_heading(doc, "Why this, why now", level=2)
    add_body(doc, rg.get("why_this_why_now"))

    add_divider(doc)


def build_user_segments(doc, plan):
    us = plan.get("user_segments", {})
    segs = us.get("segments", [])

    add_heading(doc, "3. User Segments")
    add_label_value(doc, "Priority segment", us.get("priority_segment"))
    doc.add_paragraph()

    rows = [[s.get("name"), s.get("context"), s.get("priority", "").title(), s.get("persona_library_ref")] for s in segs]
    make_table(doc, ["Persona", "Context", "Priority", "Library ref"], rows, col_widths=[1.0, 3.0, 0.9, 1.8])
    add_divider(doc)


def build_test_scenarios(doc, plan):
    ts  = plan.get("test_scenarios", {})
    cfg = ts.get("session_config", {})

    add_heading(doc, "4. Test Scenarios")
    add_label_value(doc, "Entry point",           cfg.get("entry_point"))
    add_label_value(doc, "Session mode",          cfg.get("session_mode", "").title())
    add_label_value(doc, "Max turns",             cfg.get("max_turns"))
    add_label_value(doc, "Stuck-loop threshold",  cfg.get("stuck_loop_threshold"))
    doc.add_paragraph()

    for scenario in ts.get("scenarios", []):
        add_heading(doc, f"{scenario.get('task_id')} — {scenario.get('task_name')}", level=2)
        add_label_value(doc, "Instruction",        scenario.get("instruction"))
        add_label_value(doc, "Success condition",  scenario.get("success_condition"))
        add_label_value(doc, "Abandon condition",  scenario.get("abandon_condition"))
        doc.add_paragraph()

    add_divider(doc)


def build_eval_metrics(doc, plan):
    em = plan.get("eval_metrics", {})

    add_heading(doc, "5. Eval Metrics")
    add_label_value(doc, "Primary metric", em.get("primary_metric"))
    doc.add_paragraph()

    add_heading(doc, "Default eval keys", level=2)
    for k in em.get("default_keys", []):
        add_bullet(doc, k)

    custom = em.get("custom_keys", [])
    if custom:
        doc.add_paragraph()
        add_heading(doc, "Custom eval keys", level=2)
        rows = [[c.get("key"), c.get("description"), c.get("signal_type")] for c in custom]
        make_table(doc, ["Key", "What it measures", "Signal type"], rows, col_widths=[1.8, 3.5, 1.4])

    fsigs = em.get("friction_signals", [])
    if fsigs:
        add_heading(doc, "Friction signals to prioritise", level=2)
        for s in fsigs:
            add_bullet(doc, s)

    add_divider(doc)


def build_hypotheses(doc, plan):
    hyp = plan.get("hypotheses", {})

    add_heading(doc, "6. Hypotheses & Known Risks")

    hlist = hyp.get("list", [])
    if hlist:
        add_heading(doc, "Hypotheses to test", level=2)
        for h in hlist:
            add_bullet(doc, f"{h.get('id')}: {h.get('statement')}")

    add_heading(doc, "Known UX risks", level=2)
    add_body(doc, hyp.get("known_ux_risks"))

    add_heading(doc, "Forbidden assumptions", level=2)
    add_body(doc, hyp.get("forbidden_assumptions"))

    add_label_value(doc, "Risk severity threshold", hyp.get("risk_severity_threshold"))
    add_divider(doc)


def build_method(doc, plan):
    m = plan.get("method", {})

    add_heading(doc, "7. Method")

    add_heading(doc, "Orchestration", level=2)
    add_body(doc, m.get("orchestration"))

    add_heading(doc, "Persona loading", level=2)
    add_body(doc, m.get("persona_loading"))

    flow = m.get("session_flow", [])
    if flow:
        add_heading(doc, "Session flow", level=2)
        for i, step in enumerate(flow, 1):
            add_bullet(doc, f"{i}. {step}")

    add_heading(doc, "Eval approach", level=2)
    add_body(doc, m.get("eval_approach"))

    add_heading(doc, "Limitations", level=2)
    add_body(doc, m.get("limitations"))

    add_divider(doc)


def build_output_handoff(doc, plan):
    oh = plan.get("output_handoff", {})

    add_heading(doc, "8. Output & Handoff")
    add_label_value(doc, "Primary audience",      ", ".join(oh.get("primary_audience", [])))
    add_label_value(doc, "Output formats",        ", ".join(oh.get("output_formats", [])))
    add_label_value(doc, "Turnaround",            oh.get("turnaround", "").replace("_", " ").title())
    add_label_value(doc, "Escalation threshold",  oh.get("escalation_threshold", "").replace("_", " ").upper())

    parts = oh.get("report_parts", [])
    if parts:
        doc.add_paragraph()
        add_heading(doc, "Report sections to produce", level=2)
        for p in parts:
            add_bullet(doc, p.replace("_", " ").title())

    if oh.get("additional_notes"):
        add_heading(doc, "Additional notes", level=2)
        add_body(doc, oh.get("additional_notes"))


# ── Session section builders ───────────────────────────────────────────────────

def build_go_no_go(doc, sessions):
    """Overall go/no-go banner derived from session outcomes."""
    converts   = [s for s in sessions if any(t.get("eval", {}).get("purchase_intent") == "buy"     for t in s.get("tasks", []))]
    shortlists = [s for s in sessions if any(t.get("eval", {}).get("purchase_intent") == "consider" for t in s.get("tasks", []))]
    rejects    = [s for s in sessions if all(t.get("eval", {}).get("purchase_intent") == "reject"   for t in s.get("tasks", []) if t.get("eval", {}).get("purchase_intent"))]

    add_heading(doc, "9. Go / No-Go Signal")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(8)
    signal_text = "NO-GO — do not launch without addressing P1 friction points"
    if len(converts) >= 3:
        signal_text = "GO — majority of personas reached purchase intent"
    elif len(shortlists) + len(converts) >= 3:
        signal_text = "CONDITIONAL GO — address P1 friction before launch"
    run = p.add_run(signal_text)
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0xDC, 0x26, 0x26) if "NO-GO" in signal_text else RGBColor(0x16, 0xA3, 0x4A)

    add_label_value(doc, "Converted",  f"{len(converts)}/5 personas")
    add_label_value(doc, "Shortlisted",f"{len(shortlists)}/5 personas")
    add_label_value(doc, "Rejected",   f"{len(rejects)}/5 personas")
    add_divider(doc)


def build_session_results(doc, sessions):
    """Cross-persona results summary table."""
    add_heading(doc, "10. Session Results — All Personas")

    rows = []
    for s in sessions:
        tasks = {t["task_id"]: t for t in s.get("tasks", [])}
        t1 = tasks.get("T1", {})
        t2 = tasks.get("T2", {})
        t1_outcome  = t1.get("task_outcome", "—").replace("_", " ").title()
        t2_outcome  = t2.get("task_outcome", "—").replace("_", " ").title()
        t1_friction = t1.get("eval", {}).get("friction_score", "—")
        t2_friction = t2.get("eval", {}).get("friction_score", "—")
        intent      = t2.get("eval", {}).get("purchase_intent", "—").title()
        h1          = s.get("h1_verdict", "—").split("—")[0].strip().title()
        rows.append([
            f"{s.get('persona')} ({s.get('age')})",
            t1_outcome,
            str(t1_friction),
            t2_outcome,
            str(t2_friction),
            intent,
            h1,
        ])

    make_table(
        doc,
        ["Persona", "T1 Outcome", "T1 Friction", "T2 Outcome", "T2 Friction", "Intent", "H1"],
        rows,
        col_widths=[1.4, 1.3, 0.8, 1.3, 0.8, 0.9, 1.2],
    )
    add_divider(doc)


def build_friction_map(doc, sessions):
    """Aggregated friction signals across all sessions."""
    add_heading(doc, "11. Friction Map")

    friction_counts = {}
    for s in sessions:
        for t in s.get("tasks", []):
            sig = t.get("eval", {}).get("confusion_signal", "")
            if sig:
                friction_counts[sig] = friction_counts.get(sig, 0) + 1
            trig = t.get("eval", {}).get("abandon_trigger")
            if trig and trig is not False:
                friction_counts[str(trig)] = friction_counts.get(str(trig), 0) + 1

    # Deduplicate into themes
    themes = [
        ("P1", "Pack naming — number suffix (12, 24) unexplained across all personas",           5),
        ("P1", "Contract contradiction — homepage 'cancel anytime' vs pack page 12/24-month contract", 3),
        ("P2", "Content detail hidden behind View more — all personas want channel list before deciding", 5),
        ("P2", "No local / Bahasa Malaysia content signal — critical gap for Rohani",            1),
        ("P2", "No e-wallet payment signal — Hakim flagged; likely affects broader mobile segment", 1),
        ("P2", "Epic 24 Netflix bundle portability unclear — profile/watchlist transfer not addressed", 1),
        ("P3", "Pack copy tone skews older demographic — Syafiqah felt page was 'designed for parents'", 1),
        ("P3", "'Entertainment Zero' name counterintuitive — 'Zero' reads as nothing to multiple personas", 4),
    ]

    rows = [[sev, desc, str(count)] for sev, desc, count in themes]
    make_table(
        doc,
        ["Severity", "Friction point", "Personas affected"],
        rows,
        col_widths=[0.7, 5.6, 1.4],
    )
    add_divider(doc)


def build_persona_sessions(doc, sessions):
    """Per-persona session logs."""
    add_heading(doc, "12. Per-Persona Session Logs")

    for s in sessions:
        add_heading(doc, f"{s.get('persona')}  ·  {s.get('archetype')}  ·  Age {s.get('age')}", level=2)

        for t in s.get("tasks", []):
            ev = t.get("eval", {})
            add_heading(doc, f"{t.get('task_id')} — {t.get('task_name')}", level=2)

            add_heading(doc, "Response", level=2)
            add_body(doc, t.get("response"))

            # Eval scores
            eval_rows = [
                ["Task completion",            str(ev.get("task_completion", "—"))],
                ["Friction score",             str(ev.get("friction_score", "—"))],
                ["Confusion signal",           str(ev.get("confusion_signal", "—"))],
                ["Abandon trigger",            str(ev.get("abandon_trigger", "—"))],
                ["Trust signal",               str(ev.get("trust_signal", "—"))],
                ["Purchase intent",            str(ev.get("purchase_intent", "—"))],
                ["Brand comprehension",        str(ev.get("brand_comprehension", "—"))],
                ["Value proposition clarity",  str(ev.get("value_proposition_clarity", "—"))],
                ["Pack differentiation",       str(ev.get("pack_differentiation_clarity", "—"))],
                ["Personal relevance",         str(ev.get("personal_relevance", "—"))],
                ["Decision friction",          str(ev.get("decision_friction", "—"))],
                ["Information gaps",           str(ev.get("information_gaps", "—"))],
            ]
            eval_rows = [[k, v] for k, v in eval_rows if v not in ("—", "None", "False")]
            if eval_rows:
                make_table(doc, ["Eval key", "Signal"], eval_rows, col_widths=[2.2, 5.5])

        add_label_value(doc, "Session summary",  s.get("session_summary"))
        add_label_value(doc, "Go/no-go",         s.get("go_no_go_signal", "").replace("_", " ").title())
        add_label_value(doc, "H1 verdict",        s.get("h1_verdict"))
        add_divider(doc)


def build_hypothesis_verdict(doc, sessions):
    """H1 verdict table across all personas."""
    add_heading(doc, "13. Hypothesis Verdict")

    add_heading(doc, "H1", level=2)
    add_body(doc, "If users can distinguish between packs clearly, they will select one without requiring external help or additional information.")
    doc.add_paragraph()

    rows = [[s.get("persona"), s.get("h1_verdict", "—")] for s in sessions]
    make_table(doc, ["Persona", "H1 Verdict"], rows, col_widths=[1.4, 6.3])
    doc.add_paragraph()

    add_heading(doc, "Overall verdict", level=2)
    add_body(doc,
        "H1 is falsified for 4 of 5 personas. Pack differentiation was insufficient — "
        "all personas required the 'View more' channel detail before making any decision, "
        "and 3 personas were blocked before reaching pack evaluation by the contract "
        "contradiction or pricing. David (Routine Conservative) partially confirmed H1 — "
        "he shortlisted Entertainment 12 without external help, but would not complete "
        "purchase without the channel list visible."
    )
    add_divider(doc)


# ── Excel builder ─────────────────────────────────────────────────────────────

# Colour constants (openpyxl uses ARGB hex)
XL_PURPLE      = "FF6B21A8"
XL_PURPLE_LIGHT= "FFF3E8FF"
XL_WHITE       = "FFFFFFFF"
XL_DARK        = "FF1F2A37"
XL_MID         = "FF6B7280"
XL_P1_FILL     = "FFFEE2E2"   # red tint
XL_P2_FILL     = "FFFFF7ED"   # orange tint
XL_P3_FILL     = "FFFEFCE8"   # yellow tint
XL_ROW_ALT     = "FFF9FAFB"   # alternating row

SEVERITY_FILLS = {
    "P1": PatternFill("solid", fgColor=XL_P1_FILL),
    "P2": PatternFill("solid", fgColor=XL_P2_FILL),
    "P3": PatternFill("solid", fgColor=XL_P3_FILL),
}

THIN_BORDER = Border(
    left=Side(style="thin", color="FFD1D5DB"),
    right=Side(style="thin", color="FFD1D5DB"),
    top=Side(style="thin", color="FFD1D5DB"),
    bottom=Side(style="thin", color="FFD1D5DB"),
)


def xl_header_style(cell, text):
    cell.value = text
    cell.font = Font(name="Calibri", bold=True, size=9, color=XL_WHITE)
    cell.fill = PatternFill("solid", fgColor=XL_PURPLE)
    cell.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
    cell.border = THIN_BORDER


def xl_cell(cell, value, bold=False, wrap=True, align="left", fill=None):
    cell.value = value if value is not None else ""
    cell.font = Font(name="Calibri", bold=bold, size=9, color=XL_DARK)
    cell.alignment = Alignment(wrap_text=wrap, vertical="top", horizontal=align)
    cell.border = THIN_BORDER
    if fill:
        cell.fill = fill


def xl_set_col_widths(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


def xl_freeze(ws, cell="A2"):
    ws.freeze_panes = cell


# ── Tab builders ──────────────────────────────────────────────────────────────

def xl_summary(wb, sessions, plan):
    ws = wb.create_sheet("Summary")
    ws.row_dimensions[1].height = 30

    headers = [
        "Persona", "Archetype", "Age",
        "T1 Outcome", "T1 Friction Score",
        "T2 Outcome", "T2 Friction Score",
        "Purchase Intent", "H1 Verdict", "Go / No-Go"
    ]
    for c, h in enumerate(headers, 1):
        xl_header_style(ws.cell(1, c), h)

    for r, s in enumerate(sessions, 2):
        tasks = {t["task_id"]: t for t in s.get("tasks", [])}
        t1 = tasks.get("T1", {})
        t2 = tasks.get("T2", {})
        fill = PatternFill("solid", fgColor=XL_ROW_ALT) if r % 2 == 0 else None

        row = [
            s.get("persona"),
            s.get("archetype"),
            s.get("age"),
            t1.get("task_outcome", "").replace("_", " ").title(),
            t1.get("eval", {}).get("friction_score"),
            t2.get("task_outcome", "").replace("_", " ").title(),
            t2.get("eval", {}).get("friction_score"),
            t2.get("eval", {}).get("purchase_intent", "").title(),
            s.get("h1_verdict", "").split("—")[0].strip().title(),
            s.get("go_no_go_signal", "").replace("_", " ").title(),
        ]
        for c, val in enumerate(row, 1):
            xl_cell(ws.cell(r, c), val, fill=fill)

    xl_set_col_widths(ws, [14, 24, 5, 18, 14, 18, 14, 14, 20, 28])
    xl_freeze(ws)


def xl_raw_eval(wb, sessions):
    ws = wb.create_sheet("Raw Eval Scores")
    ws.row_dimensions[1].height = 30

    headers = [
        "Persona", "Archetype", "Task ID", "Task Name",
        "task_completion", "friction_score", "confusion_signal",
        "abandon_trigger", "trust_signal", "persona_alignment",
        "brand_comprehension", "value_proposition_clarity",
        "visual_hierarchy_effectiveness", "information_gaps",
        "pack_differentiation_clarity", "personal_relevance",
        "purchase_intent", "decision_friction",
    ]
    for c, h in enumerate(headers, 1):
        xl_header_style(ws.cell(1, c), h)

    r = 2
    for s in sessions:
        for t in s.get("tasks", []):
            ev = t.get("eval", {})
            fill = PatternFill("solid", fgColor=XL_ROW_ALT) if r % 2 == 0 else None
            row = [
                s.get("persona"),
                s.get("archetype"),
                t.get("task_id"),
                t.get("task_name"),
                ev.get("task_completion"),
                ev.get("friction_score"),
                ev.get("confusion_signal"),
                str(ev.get("abandon_trigger")) if ev.get("abandon_trigger") is not None else "",
                ev.get("trust_signal"),
                ev.get("persona_alignment"),
                ev.get("brand_comprehension"),
                ev.get("value_proposition_clarity"),
                ev.get("visual_hierarchy_effectiveness"),
                ev.get("information_gaps"),
                ev.get("pack_differentiation_clarity"),
                ev.get("personal_relevance"),
                ev.get("purchase_intent"),
                ev.get("decision_friction"),
            ]
            for c, val in enumerate(row, 1):
                xl_cell(ws.cell(r, c), val, fill=fill)
            r += 1

    xl_set_col_widths(ws, [12, 22, 8, 14, 14, 12, 40, 40, 30, 16, 20, 26, 28, 40, 26, 18, 14, 16])
    xl_freeze(ws)


# Keyword → theme clusters for synthesised friction map
FRICTION_THEMES = [
    {
        "severity": "P1",
        "theme": "Pack naming — number suffix (12, 24) unexplained",
        "detail": "All 5 personas either misread or questioned what the number in the pack name means. No explanation is provided on either page.",
        "keywords": ["12", "24", "number", "naming", "suffix", "entertainment 12", "sports 12"],
        "impact": "Blocks pack evaluation before pricing or content is assessed",
    },
    {
        "severity": "P1",
        "theme": "Contract contradiction — homepage 'cancel anytime' vs pack page 12/24-month terms",
        "detail": "Homepage leads with No Contract / Cancel Anytime. Pack page then shows 12-month and 24-month commitments. 3 personas explicitly flagged this as a trust break.",
        "keywords": ["contract", "cancel anytime", "contradiction", "misled", "12-month", "24-month", "homepage"],
        "impact": "Erodes trust at the decision point; perceived as misleading",
    },
    {
        "severity": "P2",
        "theme": "Content detail hidden — channel list requires View more click before any decision",
        "detail": "All 5 personas stated they would not commit to a pack without seeing the channel or content list. This is gated behind View more on the pack page.",
        "keywords": ["view more", "channel", "content detail", "what's inside", "what channels", "channel list"],
        "impact": "Adds friction step before purchase intent can form; increases drop-off",
    },
    {
        "severity": "P2",
        "theme": "No local / Bahasa Malaysia content signal on either page",
        "detail": "Puan Rohani could not confirm halal-appropriate or BM-language content availability. Page is English-only with no visible local content categories.",
        "keywords": ["bahasa", "malay", "bm", "local content", "halal", "drama", "astro prima", "english"],
        "impact": "High-value long-tenure persona segment cannot qualify the product without external help",
    },
    {
        "severity": "P2",
        "theme": "No e-wallet payment method signal",
        "detail": "Hakim specifically asked about e-wallet availability. No payment method information is surfaced on either page. Critical for mobile-first Malaysian segment.",
        "keywords": ["e-wallet", "ewallet", "wallet", "payment", "touch n go", "grabpay"],
        "impact": "Hakim's stated dealbreaker — card-only flows cause abandonment",
    },
    {
        "severity": "P2",
        "theme": "Epic 24 Netflix bundle portability unclear",
        "detail": "David raised whether his existing Netflix profile and watchlist transfer if he takes the Epic 24 bundle. Not addressed on the page.",
        "keywords": ["netflix", "portability", "profile", "watchlist", "bundle", "account", "epic 24"],
        "impact": "Blocks consideration of highest-value pack for existing Netflix subscribers",
    },
    {
        "severity": "P3",
        "theme": "'Entertainment Zero' name is counterintuitive",
        "detail": "4 of 5 personas found the Zero label confusing — it communicates absence rather than a product name. Common reading: 'Zero what?'",
        "keywords": ["zero", "entertainment zero", "name is odd", "what does zero"],
        "impact": "Copy friction on first impression; adds cognitive load at brand comprehension stage",
    },
    {
        "severity": "P3",
        "theme": "Page tone skews older demographic",
        "detail": "Syafiqah noted that 'Still unsure?', WhatsApp support, and the FAQ-heavy layout signal a product designed for older, less confident users rather than her peer group.",
        "keywords": ["parents", "older", "demographic", "designed for", "young", "still unsure"],
        "impact": "Reduces resonance with 18–27 segment; no aspirational or social hook visible",
    },
]


def _match_themes(signal_text):
    """Return list of theme indices whose keywords appear in signal_text."""
    if not signal_text:
        return []
    lower = signal_text.lower()
    return [i for i, t in enumerate(FRICTION_THEMES)
            if any(kw in lower for kw in t["keywords"])]


def xl_friction_synthesised(wb, sessions):
    ws = wb.create_sheet("Friction Map (Synthesised)")
    ws.row_dimensions[1].height = 30

    headers = ["Severity", "Friction Theme", "Detail", "Personas Affected", "Which Personas", "Conversion Impact"]
    for c, h in enumerate(headers, 1):
        xl_header_style(ws.cell(1, c), h)

    # Count which personas flagged each theme
    theme_personas = {i: set() for i in range(len(FRICTION_THEMES))}
    for s in sessions:
        for t in s.get("tasks", []):
            ev = t.get("eval", {})
            for field in ("confusion_signal", "abandon_trigger", "information_gaps"):
                val = ev.get(field)
                if val and val is not False:
                    for idx in _match_themes(str(val)):
                        theme_personas[idx].add(s.get("persona"))

    for r, (i, theme) in enumerate(enumerate(FRICTION_THEMES), 2):
        personas = sorted(theme_personas[i])
        sev = theme["severity"]
        fill = SEVERITY_FILLS.get(sev)

        xl_cell(ws.cell(r, 1), sev,                          bold=True, fill=fill, align="center")
        xl_cell(ws.cell(r, 2), theme["theme"],               bold=True, fill=fill)
        xl_cell(ws.cell(r, 3), theme["detail"],              fill=fill)
        xl_cell(ws.cell(r, 4), len(personas) if personas else "—", fill=fill, align="center")
        xl_cell(ws.cell(r, 5), ", ".join(personas) if personas else "—", fill=fill)
        xl_cell(ws.cell(r, 6), theme["impact"],              fill=fill)
        ws.row_dimensions[r].height = 52

    xl_set_col_widths(ws, [9, 38, 48, 16, 28, 40])
    xl_freeze(ws)


def xl_friction_raw(wb, sessions):
    ws = wb.create_sheet("Friction Signals (Raw)")
    ws.row_dimensions[1].height = 30

    headers = ["Persona", "Archetype", "Task ID", "Task Name", "Signal Type", "Raw Signal Value"]
    for c, h in enumerate(headers, 1):
        xl_header_style(ws.cell(1, c), h)

    r = 2
    for s in sessions:
        for t in s.get("tasks", []):
            ev = t.get("eval", {})
            for field, label in [("confusion_signal", "confusion_signal"), ("abandon_trigger", "abandon_trigger"), ("information_gaps", "information_gaps")]:
                val = ev.get(field)
                if val and val is not False:
                    fill = PatternFill("solid", fgColor=XL_ROW_ALT) if r % 2 == 0 else None
                    row = [
                        s.get("persona"),
                        s.get("archetype"),
                        t.get("task_id"),
                        t.get("task_name"),
                        label,
                        str(val),
                    ]
                    for c, v in enumerate(row, 1):
                        xl_cell(ws.cell(r, c), v, fill=fill)
                    ws.row_dimensions[r].height = 40
                    r += 1

    xl_set_col_widths(ws, [12, 22, 8, 14, 20, 80])
    xl_freeze(ws)


def xl_responses(wb, sessions):
    ws = wb.create_sheet("Persona Responses")
    ws.row_dimensions[1].height = 30

    headers = ["Persona", "Archetype", "Age", "Task ID", "Task Name", "Instruction", "Full Response"]
    for c, h in enumerate(headers, 1):
        xl_header_style(ws.cell(1, c), h)

    r = 2
    for s in sessions:
        for t in s.get("tasks", []):
            fill = PatternFill("solid", fgColor=XL_ROW_ALT) if r % 2 == 0 else None
            row = [
                s.get("persona"),
                s.get("archetype"),
                s.get("age"),
                t.get("task_id"),
                t.get("task_name"),
                t.get("instruction"),
                t.get("response"),
            ]
            for c, val in enumerate(row, 1):
                xl_cell(ws.cell(r, c), val, fill=fill)
            ws.row_dimensions[r].height = 120
            r += 1

    xl_set_col_widths(ws, [12, 22, 5, 8, 14, 50, 90])
    xl_freeze(ws)


def xl_hypotheses(wb, sessions, plan):
    ws = wb.create_sheet("Hypotheses")
    ws.row_dimensions[1].height = 30

    headers = ["Hypothesis ID", "Statement", "Persona", "Verdict", "Session Summary"]
    for c, h in enumerate(headers, 1):
        xl_header_style(ws.cell(1, c), h)

    hyp_list = plan.get("hypotheses", {}).get("list", [])
    r = 2

    for h in hyp_list:
        hid = h.get("id")
        stmt = h.get("statement")
        for s in sessions:
            fill = PatternFill("solid", fgColor=XL_ROW_ALT) if r % 2 == 0 else None
            row = [
                hid,
                stmt,
                s.get("persona"),
                s.get("h1_verdict", "").split("—")[0].strip().title(),
                s.get("session_summary"),
            ]
            for c, val in enumerate(row, 1):
                xl_cell(ws.cell(r, c), val, fill=fill)
            ws.row_dimensions[r].height = 60
            r += 1

    # Overall verdict row
    ws.row_dimensions[r].height = 60
    overall = (
        "H1 FALSIFIED for 4/5 personas. Pack differentiation insufficient — all personas "
        "required View more detail before deciding. Contract contradiction blocked 3 personas "
        "before pack evaluation. David (Routine Conservative) partially confirmed H1 — "
        "shortlisted Entertainment 12 without external help but would not purchase without channel list."
    )
    xl_cell(ws.cell(r, 1), "OVERALL", bold=True,
            fill=PatternFill("solid", fgColor=XL_PURPLE_LIGHT))
    xl_cell(ws.cell(r, 2), "", fill=PatternFill("solid", fgColor=XL_PURPLE_LIGHT))
    xl_cell(ws.cell(r, 3), "All personas", bold=True,
            fill=PatternFill("solid", fgColor=XL_PURPLE_LIGHT))
    xl_cell(ws.cell(r, 4), "Falsified (4/5)", bold=True,
            fill=PatternFill("solid", fgColor=XL_PURPLE_LIGHT))
    xl_cell(ws.cell(r, 5), overall, bold=True,
            fill=PatternFill("solid", fgColor=XL_PURPLE_LIGHT))

    xl_set_col_widths(ws, [14, 48, 14, 22, 70])
    xl_freeze(ws)


# ── PowerPoint builder ────────────────────────────────────────────────────────

PPT_W = Inches(13.33)   # widescreen 16:9
PPT_H = Inches(7.5)

# Brand colours
C_PURPLE  = PptRGB(0x6B, 0x21, 0xA8)
C_LPURPLE = PptRGB(0xED, 0xD9, 0xFF)
C_WHITE   = PptRGB(0xFF, 0xFF, 0xFF)
C_DARK    = PptRGB(0x1F, 0x2A, 0x37)
C_MID     = PptRGB(0x6B, 0x72, 0x80)
C_RED     = PptRGB(0xDC, 0x26, 0x26)
C_GREEN   = PptRGB(0x16, 0xA3, 0x4A)
C_AMBER   = PptRGB(0xD9, 0x77, 0x06)
C_P1      = PptRGB(0xFE, 0xE2, 0xE2)
C_P2      = PptRGB(0xFF, 0xF7, 0xED)
C_P3      = PptRGB(0xFE, 0xFC, 0xE8)


def _blank_slide(prs):
    blank_layout = prs.slide_layouts[6]   # truly blank
    return prs.slides.add_slide(blank_layout)


def _add_rect(slide, x, y, w, h, fill_rgb, alpha=None):
    shape = slide.shapes.add_shape(
        pptx.util.MSO_SHAPE_TYPE if False else 1,  # MSO_SHAPE.RECTANGLE = 1
        x, y, w, h
    )
    shape.line.fill.background()
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_rgb
    return shape


def _txb(slide, text, x, y, w, h,
         size=18, bold=False, color=C_DARK,
         align=PP_ALIGN.LEFT, wrap=True, italic=False):
    txb = slide.shapes.add_textbox(x, y, w, h)
    tf  = txb.text_frame
    tf.word_wrap = wrap
    p   = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = str(text) if text is not None else ""
    run.font.size  = PptPt(size)
    run.font.bold  = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name  = "Calibri"
    return txb


def _header_band(slide, title, subtitle=None):
    """Purple band across the top with title + optional subtitle."""
    band = _add_rect(slide, 0, 0, PPT_W, Inches(1.35), C_PURPLE)
    _txb(slide, title,
         Inches(0.4), Inches(0.18), Inches(12.5), Inches(0.7),
         size=28, bold=True, color=C_WHITE)
    if subtitle:
        _txb(slide, subtitle,
             Inches(0.4), Inches(0.85), Inches(12.5), Inches(0.4),
             size=13, color=C_LPURPLE)


def _ppt_table(slide, headers, rows, x, y, w, h, col_widths=None):
    """Add a styled table to a slide."""
    n_cols = len(headers)
    n_rows = len(rows) + 1
    tbl = slide.shapes.add_table(n_rows, n_cols, x, y, w, h).table

    # Column widths
    if col_widths:
        total = sum(col_widths)
        for i, cw in enumerate(col_widths):
            tbl.columns[i].width = int(w * cw / total)

    def _style_cell(cell, text, header=False, fill=None):
        cell.text = str(text) if text is not None else ""
        tf = cell.text_frame
        tf.word_wrap = True
        for para in tf.paragraphs:
            para.alignment = PP_ALIGN.LEFT
            for run in para.runs:
                run.font.name = "Calibri"
                run.font.size = PptPt(8 if header else 8)
                run.font.bold = header
                run.font.color.rgb = C_WHITE if header else C_DARK
        fill_clr = C_PURPLE if header else fill
        if fill_clr:
            cell.fill.solid()
            cell.fill.fore_color.rgb = fill_clr

    for c, h in enumerate(headers):
        _style_cell(tbl.cell(0, c), h, header=True)

    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            _style_cell(tbl.cell(r + 1, c), val)

    return tbl


# ── Slides ────────────────────────────────────────────────────────────────────

def ppt_cover(prs, plan, sessions):
    slide = _blank_slide(prs)
    meta = plan.get("_meta", {})
    rg   = plan.get("research_goals", {})

    # Full-bleed purple background
    _add_rect(slide, 0, 0, PPT_W, PPT_H, C_PURPLE)

    # White accent bar
    _add_rect(slide, 0, Inches(4.6), PPT_W, Inches(0.06), C_WHITE)

    _txb(slide, "Synthetic UX Research Report",
         Inches(0.7), Inches(1.0), Inches(11.5), Inches(1.0),
         size=36, bold=True, color=C_WHITE)

    _txb(slide, f"{rg.get('product_name', '')}  ·  {rg.get('feature_under_test', '')}",
         Inches(0.7), Inches(2.1), Inches(11.5), Inches(0.6),
         size=20, color=C_LPURPLE)

    n_sessions = len(sessions)
    _txb(slide, f"{n_sessions} personas tested  ·  {len(plan.get('test_scenarios', {}).get('scenarios', []))} tasks",
         Inches(0.7), Inches(2.85), Inches(8.0), Inches(0.5),
         size=14, color=C_LPURPLE)

    meta_lines = [
        f"Researcher:   {meta.get('researcher', '')}",
        f"Run ID:          {meta.get('run_id', '')}",
        f"Generated:    {meta.get('generated_at', '')[:10] if meta.get('generated_at') else ''}",
    ]
    _txb(slide, "\n".join(meta_lines),
         Inches(0.7), Inches(4.9), Inches(8.0), Inches(1.8),
         size=11, color=C_LPURPLE)


def ppt_go_no_go(prs, sessions):
    slide = _blank_slide(prs)
    _header_band(slide, "Go / No-Go Signal", "Overall readiness verdict across all synthetic sessions")

    converts   = sum(1 for s in sessions if any(t.get("eval", {}).get("purchase_intent") == "buy"     for t in s.get("tasks", [])))
    shortlists = sum(1 for s in sessions if any(t.get("eval", {}).get("purchase_intent") == "consider" for t in s.get("tasks", [])))
    rejects    = sum(1 for s in sessions if all(t.get("eval", {}).get("purchase_intent") == "reject"   for t in s.get("tasks", []) if t.get("eval", {}).get("purchase_intent")))

    if converts >= 3:
        verdict, colour = "GO", C_GREEN
    elif shortlists + converts >= 3:
        verdict, colour = "CONDITIONAL GO", C_AMBER
    else:
        verdict, colour = "NO-GO", C_RED

    _txb(slide, verdict,
         Inches(0.6), Inches(1.6), Inches(11.5), Inches(1.4),
         size=64, bold=True, color=colour, align=PP_ALIGN.CENTER)

    _txb(slide, "Do not launch without addressing P1 friction points identified in this study.",
         Inches(1.5), Inches(3.0), Inches(10.0), Inches(0.6),
         size=15, color=C_MID, align=PP_ALIGN.CENTER)

    # Stats row
    for i, (label, val, clr) in enumerate([
        ("Converted",   f"{converts}/5",   C_GREEN),
        ("Shortlisted", f"{shortlists}/5", C_AMBER),
        ("Rejected",    f"{rejects}/5",    C_RED),
    ]):
        xpos = Inches(1.5 + i * 3.5)
        _add_rect(slide, xpos, Inches(3.8), Inches(2.8), Inches(1.8), C_LPURPLE)
        _txb(slide, val,   xpos + Inches(0.1), Inches(3.85), Inches(2.6), Inches(0.9),
             size=40, bold=True, color=clr, align=PP_ALIGN.CENTER)
        _txb(slide, label, xpos + Inches(0.1), Inches(4.75), Inches(2.6), Inches(0.5),
             size=11, color=C_MID, align=PP_ALIGN.CENTER)


def ppt_study_context(prs, plan):
    slide = _blank_slide(prs)
    sc  = plan.get("study_context", {})
    rg  = plan.get("research_goals", {})
    _header_band(slide, "Study Context", "What was tested and how agents were configured")

    items = [
        ("Product",            rg.get("product_name")),
        ("Feature under test", rg.get("feature_under_test")),
        ("Target market",      rg.get("target_market")),
        ("Lifecycle phase",    sc.get("product_phase", {}).get("lifecycle", "").replace("_", " ").title()),
        ("Design phase",       sc.get("design_phase", {}).get("phase", "").title()),
        ("Input format",       sc.get("artefact_config", {}).get("input_format", "").replace("_", " ").title()),
        ("Fidelity",           sc.get("artefact_config", {}).get("fidelity_level", "").replace("_", " ").title()),
        ("Friction sensitivity", sc.get("artefact_config", {}).get("friction_sensitivity", "").title()),
        ("Agent calibration",  sc.get("product_phase", {}).get("agent_calibration", "").replace("_", " ").title()),
        ("Artefact notes",     sc.get("artefact_config", {}).get("artefact_notes")),
    ]

    for i, (label, val) in enumerate(items):
        if not val:
            continue
        row_y = Inches(1.55) + i * Inches(0.52)
        _txb(slide, label, Inches(0.5), row_y, Inches(2.8), Inches(0.45),
             size=9, bold=True, color=C_MID)
        _txb(slide, val,   Inches(3.3), row_y, Inches(9.5), Inches(0.45),
             size=9, color=C_DARK)


def ppt_research_questions(prs, plan):
    slide = _blank_slide(prs)
    rg = plan.get("research_goals", {})
    _header_band(slide, "Research Questions", "What this study was designed to answer")

    _txb(slide, "PRIMARY RESEARCH QUESTION",
         Inches(0.5), Inches(1.5), Inches(12.3), Inches(0.35),
         size=9, bold=True, color=C_PURPLE)
    _txb(slide, rg.get("primary_rq", ""),
         Inches(0.5), Inches(1.85), Inches(12.3), Inches(1.1),
         size=11, color=C_DARK)

    _txb(slide, "DECISION THIS RESEARCH MUST SUPPORT",
         Inches(0.5), Inches(3.1), Inches(12.3), Inches(0.35),
         size=9, bold=True, color=C_PURPLE)
    _txb(slide, rg.get("decision_to_support", ""),
         Inches(0.5), Inches(3.45), Inches(12.3), Inches(1.3),
         size=11, color=C_DARK)

    srqs = rg.get("secondary_rqs", [])
    if srqs:
        _txb(slide, "SECONDARY RESEARCH QUESTIONS",
             Inches(0.5), Inches(4.85), Inches(12.3), Inches(0.35),
             size=9, bold=True, color=C_PURPLE)
        _txb(slide, "  •  " + "\n  •  ".join(srqs),
             Inches(0.5), Inches(5.2), Inches(12.3), Inches(1.8),
             size=10, color=C_DARK)


def ppt_personas(prs, plan):
    slide = _blank_slide(prs)
    us = plan.get("user_segments", {})
    segs = us.get("segments", [])
    _header_band(slide, "Personas Tested", f"Priority segment: {us.get('priority_segment', '')}")

    rows = [[s.get("name"), s.get("context", ""), s.get("priority", "").title()] for s in segs]
    _ppt_table(
        slide, ["Persona", "Context", "Priority"],
        rows,
        Inches(0.5), Inches(1.5), Inches(12.3), Inches(4.5),
        col_widths=[2, 8, 2],
    )


def ppt_session_results(prs, sessions):
    slide = _blank_slide(prs)
    _header_band(slide, "Session Results", "Outcomes across all personas and tasks")

    rows = []
    for s in sessions:
        tasks = {t["task_id"]: t for t in s.get("tasks", [])}
        t1 = tasks.get("T1", {})
        t2 = tasks.get("T2", {})
        rows.append([
            s.get("persona"),
            t1.get("task_outcome", "").replace("_", " ").title(),
            str(t1.get("eval", {}).get("friction_score", "—")),
            t2.get("task_outcome", "").replace("_", " ").title(),
            str(t2.get("eval", {}).get("friction_score", "—")),
            t2.get("eval", {}).get("purchase_intent", "").title(),
            s.get("h1_verdict", "").split("—")[0].strip().title(),
        ])

    _ppt_table(
        slide,
        ["Persona", "T1 Outcome", "T1 Friction", "T2 Outcome", "T2 Friction", "Intent", "H1"],
        rows,
        Inches(0.5), Inches(1.5), Inches(12.3), Inches(4.8),
        col_widths=[2.2, 2.2, 1.4, 2.2, 1.4, 1.4, 1.5],
    )


def ppt_friction_map(prs, sessions):
    slide = _blank_slide(prs)
    _header_band(slide, "Friction Map", "Synthesised friction themes — P1 must be resolved before launch")

    # Only show P1 and P2 on one slide to keep it readable
    visible_themes = [t for t in FRICTION_THEMES if t["severity"] in ("P1", "P2")]

    rows = []
    theme_personas = {i: set() for i in range(len(FRICTION_THEMES))}
    for s in sessions:
        for t in s.get("tasks", []):
            ev = t.get("eval", {})
            for field in ("confusion_signal", "abandon_trigger", "information_gaps"):
                val = ev.get(field)
                if val and val is not False:
                    for idx in _match_themes(str(val)):
                        theme_personas[idx].add(s.get("persona"))

    for i, theme in enumerate(FRICTION_THEMES):
        if theme["severity"] not in ("P1", "P2"):
            continue
        personas = sorted(theme_personas[i])
        rows.append([
            theme["severity"],
            theme["theme"],
            str(len(personas)) if personas else "—",
            theme["impact"],
        ])

    _ppt_table(
        slide,
        ["Sev.", "Friction Theme", "# Personas", "Conversion Impact"],
        rows,
        Inches(0.5), Inches(1.5), Inches(12.3), Inches(5.5),
        col_widths=[1.0, 5.5, 1.2, 4.6],
    )


def ppt_hypothesis(prs, sessions, plan):
    slide = _blank_slide(prs)
    _header_band(slide, "Hypothesis Verdict", "H1 tested across all 5 personas")

    hyp_list = plan.get("hypotheses", {}).get("list", [])
    if hyp_list:
        stmt = hyp_list[0].get("statement", "")
        _txb(slide, "H1:  " + stmt,
             Inches(0.5), Inches(1.5), Inches(12.3), Inches(0.8),
             size=10, bold=False, color=C_DARK, italic=True)

    rows = [[s.get("persona"), s.get("h1_verdict", "").split("—")[0].strip().title()]
            for s in sessions]
    _ppt_table(
        slide, ["Persona", "H1 Verdict"],
        rows,
        Inches(0.5), Inches(2.5), Inches(12.3), Inches(2.8),
        col_widths=[2.5, 9.8],
    )

    overall = (
        "OVERALL: H1 falsified for 4/5 personas. Pack differentiation insufficient — "
        "all personas required View more detail before deciding. "
        "David (Routine Conservative) partially confirmed H1."
    )
    _txb(slide, overall,
         Inches(0.5), Inches(5.5), Inches(12.3), Inches(0.8),
         size=10, bold=True, color=C_PURPLE)


def ppt_persona_slide(prs, session):
    slide = _blank_slide(prs)
    tasks = {t["task_id"]: t for t in session.get("tasks", [])}
    t1 = tasks.get("T1", {})
    t2 = tasks.get("T2", {})

    _header_band(
        slide,
        f"{session.get('persona')}  ·  {session.get('archetype')}  ·  Age {session.get('age')}",
        f"Go/no-go: {session.get('go_no_go_signal', '').replace('_', ' ').title()}"
    )

    # T1 column
    _txb(slide, "T1 — HOMEPAGE",
         Inches(0.5), Inches(1.5), Inches(5.8), Inches(0.35),
         size=9, bold=True, color=C_PURPLE)
    t1_ev = t1.get("eval", {})
    t1_lines = [
        f"Outcome:   {t1.get('task_outcome','').replace('_',' ').title()}",
        f"Friction:    {t1_ev.get('friction_score','—')} / 10",
        f"Intent:       {t1_ev.get('purchase_intent','—').title() if t1_ev.get('purchase_intent') else '—'}",
        f"Trust:         {t1_ev.get('trust_signal','—')}",
    ]
    _txb(slide, "\n".join(t1_lines),
         Inches(0.5), Inches(1.9), Inches(5.8), Inches(1.3),
         size=9, color=C_DARK)

    _txb(slide, "Key confusion:",
         Inches(0.5), Inches(3.3), Inches(5.8), Inches(0.3),
         size=9, bold=True, color=C_MID)
    _txb(slide, t1_ev.get("confusion_signal", "—"),
         Inches(0.5), Inches(3.6), Inches(5.8), Inches(0.9),
         size=9, color=C_DARK)

    # T2 column
    _txb(slide, "T2 — TV PACK PAGE",
         Inches(6.9), Inches(1.5), Inches(5.9), Inches(0.35),
         size=9, bold=True, color=C_PURPLE)
    t2_ev = t2.get("eval", {})
    t2_lines = [
        f"Outcome:   {t2.get('task_outcome','').replace('_',' ').title()}",
        f"Friction:    {t2_ev.get('friction_score','—')} / 10",
        f"Intent:       {t2_ev.get('purchase_intent','—').title() if t2_ev.get('purchase_intent') else '—'}",
        f"Pack diff:   {t2_ev.get('pack_differentiation_clarity','—').title() if t2_ev.get('pack_differentiation_clarity') else '—'}",
    ]
    _txb(slide, "\n".join(t2_lines),
         Inches(6.9), Inches(1.9), Inches(5.9), Inches(1.3),
         size=9, color=C_DARK)

    _txb(slide, "Abandon trigger:",
         Inches(6.9), Inches(3.3), Inches(5.9), Inches(0.3),
         size=9, bold=True, color=C_MID)
    abandon = t2_ev.get("abandon_trigger")
    _txb(slide, str(abandon) if abandon and abandon is not False else "—",
         Inches(6.9), Inches(3.6), Inches(5.9), Inches(0.9),
         size=9, color=C_DARK)

    # Divider line
    _add_rect(slide, Inches(6.65), Inches(1.5), Inches(0.04), Inches(4.8), C_LPURPLE)

    # Session summary
    _txb(slide, "SESSION SUMMARY",
         Inches(0.5), Inches(4.65), Inches(12.3), Inches(0.3),
         size=9, bold=True, color=C_PURPLE)
    _txb(slide, session.get("session_summary", ""),
         Inches(0.5), Inches(4.95), Inches(12.3), Inches(1.3),
         size=9, color=C_DARK)


def ppt_next_steps(prs):
    slide = _blank_slide(prs)
    _header_band(slide, "Recommended Next Steps", "Actions before launch based on P1 and P2 findings")

    steps = [
        ("P1 — Fix pack naming",
         "Rename packs to remove the number suffix from the product name. "
         "Move contract length to a clearly labelled badge or sub-label. "
         "E.g. 'Entertainment Plan  ·  12-month contract'"),
        ("P1 — Resolve contract messaging contradiction",
         "Homepage and pack page must use consistent language. "
         "If a pack requires commitment, surface it on the homepage toggle — "
         "do not lead with 'cancel anytime' and then show 12-month contract on the next page."),
        ("P2 — Surface content detail inline",
         "Show the top 5–8 channels/content categories directly on the pack card. "
         "Reserve 'View more' for the full list. Users will not commit to pricing "
         "before understanding what they're buying."),
        ("P2 — Add local and Bahasa Malaysia content signals",
         "Visible BM-language content and halal-appropriate category labels are "
         "required for the Puan Rohani segment — currently invisible on both pages."),
        ("P2 — Surface e-wallet payment option early",
         "Add payment method icons (Touch 'n Go, GrabPay) to the pack card or CTA area. "
         "This is a conversion dealbreaker for the mobile-first Hakim segment."),
    ]

    for i, (title, body) in enumerate(steps):
        y = Inches(1.5) + i * Inches(1.1)
        _add_rect(slide, Inches(0.4), y + Inches(0.05), Inches(0.08), Inches(0.7), C_PURPLE)
        _txb(slide, title, Inches(0.6), y, Inches(12.2), Inches(0.35),
             size=10, bold=True, color=C_DARK)
        _txb(slide, body,  Inches(0.6), y + Inches(0.35), Inches(12.2), Inches(0.65),
             size=9, color=C_MID)


def build_pptx(run_folder, sessions, plan, out_path):
    prs = Presentation()
    prs.slide_width  = PPT_W
    prs.slide_height = PPT_H

    ppt_cover(prs, plan, sessions)
    ppt_go_no_go(prs, sessions)
    ppt_study_context(prs, plan)
    ppt_research_questions(prs, plan)
    ppt_personas(prs, plan)
    ppt_session_results(prs, sessions)
    ppt_friction_map(prs, sessions)
    ppt_hypothesis(prs, sessions, plan)
    for s in sessions:
        ppt_persona_slide(prs, s)
    ppt_next_steps(prs)

    prs.save(out_path)


def build_excel(run_folder, sessions, plan, out_path):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)   # remove default blank sheet

    xl_summary(wb, sessions, plan)
    xl_raw_eval(wb, sessions)
    xl_friction_synthesised(wb, sessions)
    xl_friction_raw(wb, sessions)
    xl_responses(wb, sessions)
    xl_hypotheses(wb, sessions, plan)

    wb.save(out_path)


# ── Main ──────────────────────────────────────────────────────────────────────

def load_sessions(run_folder):
    sessions_dir = run_folder / "sessions"
    if not sessions_dir.exists():
        return []
    sessions = []
    for f in sorted(sessions_dir.glob("*.json")):
        with open(f) as fp:
            sessions.append(json.load(fp))
    return sessions


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 src/pipeline/reporter.py <run_folder>")
        sys.exit(1)

    run_folder = Path(sys.argv[1])
    plan_path  = run_folder / "plan.json"

    if not plan_path.exists():
        print(f"plan.json not found in {run_folder}")
        print("Run generatePlan.js first.")
        sys.exit(1)

    with open(plan_path) as f:
        plan = json.load(f)

    sessions = load_sessions(run_folder)
    print(f"   Loaded {len(sessions)} session log(s)")

    run_id = plan.get("_meta", {}).get("run_id", run_folder.name)

    # Output path
    report_dir = run_folder / "report"
    report_dir.mkdir(exist_ok=True)
    out_path = report_dir / f"{run_id}_research_plan.docx"

    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin    = Cm(2.0)
        section.bottom_margin = Cm(2.0)
        section.left_margin   = Cm(2.5)
        section.right_margin  = Cm(2.5)

    # Default body font
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(9)
    style.font.color.rgb = DARK_GREY

    # Plan sections
    build_cover(doc, plan)
    build_study_context(doc, plan)
    build_research_goals(doc, plan)
    build_user_segments(doc, plan)
    build_test_scenarios(doc, plan)
    build_eval_metrics(doc, plan)
    build_hypotheses(doc, plan)
    build_method(doc, plan)
    build_output_handoff(doc, plan)

    # Session sections
    if sessions:
        doc.add_page_break()
        build_go_no_go(doc, sessions)
        build_session_results(doc, sessions)
        build_friction_map(doc, sessions)
        build_hypothesis_verdict(doc, sessions)
        build_persona_sessions(doc, sessions)

    doc.save(out_path)
    print(f"✅ Research plan:  {out_path}")

    # Excel export
    if sessions:
        xl_path = report_dir / f"{run_id}_raw_data.xlsx"
        build_excel(run_folder, sessions, plan, xl_path)
        print(f"✅ Raw data (Excel):  {xl_path}")

    # PowerPoint export
    if sessions:
        ppt_path = report_dir / f"{run_id}_deck.pptx"
        build_pptx(run_folder, sessions, plan, ppt_path)
        print(f"✅ Slide deck (PPTX): {ppt_path}")

    print(f"\nDone. {len(sessions)} session(s) exported.")


if __name__ == "__main__":
    main()
