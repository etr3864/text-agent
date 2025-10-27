#!/usr/bin/env python3
"""
PDF Parser using PyMuPDF (fitz)
This script extracts text from a PDF file and returns it as JSON
"""

import sys
import json

def parse_pdf(pdf_content):
    """Extract text from PDF content"""
    try:
        import fitz  # PyMuPDF
        from io import BytesIO
        
        # Create PDF document from bytes
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        
        full_text = ""
        num_pages = len(pdf_document)
        
        for page_num in range(num_pages):
            page = pdf_document[page_num]
            text = page.get_text()
            if text:
                full_text += f"\n--- Page {page_num + 1} ---\n"
                full_text += text
        
        pdf_document.close()
        
        return {
            "success": True,
            "text": full_text.strip(),
            "pages": num_pages
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "pages": 0
        }

if __name__ == "__main__":
    # Read PDF content from stdin
    try:
        pdf_content = sys.stdin.buffer.read()
        
        # Parse PDF
        result = parse_pdf(pdf_content)
        
        # Output result as JSON
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0 if result["success"] else 1)
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "text": "",
            "pages": 0
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

