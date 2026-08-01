def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """
    Recursively splits raw document text into overlapping chunks with character size limits.
    """
    chunks = []
    if not text:
        return chunks
        
    start = 0
    text_length = len(text)
    chunk_index = 0
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk_str = text[start:end]
        
        chunks.append({
            "chunk_index": chunk_index,
            "text": chunk_str.strip(),
            "character_count": len(chunk_str.strip()),
            "token_count": len(chunk_str.split())
        })
        
        chunk_index += 1
        if end >= text_length:
            break
        start += (chunk_size - overlap)
        
    return chunks
