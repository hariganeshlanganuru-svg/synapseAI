import io
import pypdf
import docx

def parse_document(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Parses PDF, DOCX, or TXT binary bytes and returns a list of page/section dicts.
    """
    pages = []
    filename_lower = filename.lower()
    
    if filename_lower.endswith(".pdf"):
        pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        for idx, page in enumerate(pdf_reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages.append({"page_number": idx + 1, "text": text.strip()})
                
    elif filename_lower.endswith(".docx"):
        doc = docx.Document(io.BytesIO(file_bytes))
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        pages.append({"page_number": 1, "text": full_text})
        
    else:  # TXT or Markdown
        text = file_bytes.decode("utf-8", errors="ignore")
        pages.append({"page_number": 1, "text": text.strip()})
        
    return pages
