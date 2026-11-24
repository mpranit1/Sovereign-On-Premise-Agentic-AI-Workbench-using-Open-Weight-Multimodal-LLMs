import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import pypdf
import docx
import pandas as pd

class DocumentExtractor:
    """Extracts structured text, tables, and page metadata from files."""

    @staticmethod
    def extract(file_path: str, mime_type: str) -> List[Dict[str, Any]]:
        """Returns list of chunk objects: [{'text': '...', 'page': 1, 'section': '...'}]"""
        path = Path(file_path)
        if not path.exists():
            return []

        suffix = path.suffix.lower()
        if suffix == ".pdf" or "pdf" in mime_type:
            return DocumentExtractor._extract_pdf(file_path)
        elif suffix in [".docx", ".doc"] or "word" in mime_type:
            return DocumentExtractor._extract_docx(file_path)
        elif suffix == ".csv" or "csv" in mime_type:
            return DocumentExtractor._extract_csv(file_path)
        elif suffix in [".xlsx", ".xls"] or "excel" in mime_type or "spreadsheet" in mime_type:
            return DocumentExtractor._extract_excel(file_path)
        else:
            return DocumentExtractor._extract_text(file_path)

    @staticmethod
    def _extract_pdf(file_path: str) -> List[Dict[str, Any]]:
        results = []
        try:
            reader = pypdf.PdfReader(file_path)
            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    results.append({
                        "text": text.strip(),
                        "page": idx + 1,
                        "section": f"Page {idx + 1}"
                    })
        except Exception as e:
            results.append({"text": f"Error parsing PDF: {str(e)}", "page": 1, "section": "Error"})
        return results

    @staticmethod
    def _extract_docx(file_path: str) -> List[Dict[str, Any]]:
        results = []
        try:
            doc = docx.Document(file_path)
            full_text = []
            for p in doc.paragraphs:
                if p.text.strip():
                    full_text.append(p.text)
            
            # Extract tables as well
            for t_idx, table in enumerate(doc.tables):
                t_rows = []
                for row in table.rows:
                    t_rows.append(" | ".join([cell.text.strip() for cell in row.cells]))
                if t_rows:
                    full_text.append(f"\n[Table {t_idx+1}]\n" + "\n".join(t_rows))

            combined = "\n\n".join(full_text)
            if combined:
                results.append({"text": combined, "page": 1, "section": "Document Body"})
        except Exception as e:
            results.append({"text": f"Error parsing DOCX: {str(e)}", "page": 1, "section": "Error"})
        return results

    @staticmethod
    def _extract_csv(file_path: str) -> List[Dict[str, Any]]:
        results = []
        try:
            df = pd.read_csv(file_path, nrows=500)
            summary = f"CSV Dimensions: {df.shape[0]} rows, {df.shape[1]} columns.\n"
            summary += f"Columns: {', '.join(df.columns.astype(str))}\n\n"
            summary += df.to_string(index=False)
            results.append({"text": summary, "page": 1, "section": "Tabular Content"})
        except Exception as e:
            results.append({"text": f"Error parsing CSV: {str(e)}", "page": 1, "section": "Error"})
        return results

    @staticmethod
    def _extract_excel(file_path: str) -> List[Dict[str, Any]]:
        results = []
        try:
            xls = pd.ExcelFile(file_path)
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=200)
                summary = f"Worksheet: {sheet_name} ({df.shape[0]} rows, {df.shape[1]} columns)\n"
                summary += df.to_string(index=False)
                results.append({"text": summary, "page": 1, "section": sheet_name})
        except Exception as e:
            results.append({"text": f"Error parsing Excel: {str(e)}", "page": 1, "section": "Error"})
        return results

    @staticmethod
    def _extract_text(file_path: str) -> List[Dict[str, Any]]:
        results = []
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                if content.strip():
                    results.append({"text": content.strip(), "page": 1, "section": "Full Document"})
        except Exception as e:
            results.append({"text": f"Error reading text: {str(e)}", "page": 1, "section": "Error"})
        return results

    @staticmethod
    def compare_documents(doc_texts: List[Dict[str, str]]) -> Dict[str, Any]:
        """Compares two or more documents and generates a diff summary."""
        if len(doc_texts) < 2:
            return {"error": "At least two documents are required for comparison."}
        
        doc_a = doc_texts[0]
        doc_b = doc_texts[1]
        
        lines_a = set([l.strip() for l in doc_a["text"].split("\n") if len(l.strip()) > 15])
        lines_b = set([l.strip() for l in doc_b["text"].split("\n") if len(l.strip()) > 15])
        
        added = list(lines_b - lines_a)[:10]
        removed = list(lines_a - lines_b)[:10]
        common = list(lines_a.intersection(lines_b))[:5]
        
        return {
            "doc_a_name": doc_a.get("name", "Document A"),
            "doc_b_name": doc_b.get("name", "Document B"),
            "executive_summary": f"Comparison between '{doc_a.get('name')}' and '{doc_b.get('name')}'. Found {len(added)} distinct clauses added and {len(removed)} distinct clauses removed.",
            "added_sections": added,
            "removed_sections": removed,
            "common_provisions_count": len(common),
            "similarity_ratio": round(len(common) / max(len(lines_a | lines_b), 1), 2)
        }
