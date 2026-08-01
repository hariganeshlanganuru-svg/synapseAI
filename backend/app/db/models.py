import uuid
import datetime
from sqlalchemy import Column, String, Integer, Text, Float, DateTime, ForeignKey, JSON
from app.db.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="Employee")  # Employee, HR, Manager, Admin
    department = Column(String, default="General")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    uploaded_by = Column(String, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    file_path = Column(Text, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    min_role = Column(String, default="Employee")
    status = Column(String, default="INDEXED")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"))
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    vector_id = Column(String, nullable=False)
    token_count = Column(Integer, default=0)

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, index=True, nullable=False)
    sender = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    citations = Column(JSON, default=list)
    latency_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String, default="SENT")
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
