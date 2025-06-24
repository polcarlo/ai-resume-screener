import os
import re
import PyPDF2
import docx
from sklearn.feature_extraction.text import TfidfVectorizer
import en_core_web_lg
from sentence_transformers import SentenceTransformer, util

nlp_model = en_core_web_lg.load()
embed_model = SentenceTransformer('all-MiniLM-L6-v2')

SKILLS_LIST = []
STOPWORDS_LIST = []

ALLOWED_EXTS = {'.pdf', '.docx', '.txt'}

def allowed_file(filename):
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTS

def extract_text(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.pdf':
        text = ''
        with open(filepath, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += (page.extract_text() or '') + '\n'
        return text
    if ext == '.docx':
        doc = docx.Document(filepath)
        return '\n'.join(p.text for p in doc.paragraphs)
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def preprocess_text(text):
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def extract_name(text):
    doc = nlp_model(text)
    for ent in doc.ents:
        if ent.label_ == 'PERSON' and len(ent.text.split()) >= 2:
            return ent.text.strip()
    patterns = [
        r'(?i)\b(name|full[- ]?name)\s*[:|-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'
    ]
    for pat in patterns:
        matches = re.findall(pat, text)
        if matches:
            m = matches[0]
            return m[1] if isinstance(m, tuple) else m
    return None

def extract_entities(text):
    text_lower = text.lower()
    skills = {s for s in SKILLS_LIST if re.search(rf"\b{s}\b", text_lower)}
    doc = nlp_model(text)
    for tok in doc:
        if tok.text.lower() in SKILLS_LIST:
            skills.add(tok.text.lower())
    experience = [ent.text for ent in doc.ents if ent.label_ in ('DATE','TIME')]
    education = [ent.text for ent in doc.ents if ent.label_ == 'ORG']
    certifications = [ent.text for ent in doc.ents if ent.label_ == 'PRODUCT']
    return list(skills), experience, education, certifications

def calc_similarity(text1, text2):
    emb1 = embed_model.encode(text1, convert_to_tensor=True)
    emb2 = embed_model.encode(text2, convert_to_tensor=True)
    score = util.pytorch_cos_sim(emb1, emb2).item()
    return round(score * 100, 2)

def extract_keywords(text, top_n=20):
    vec = TfidfVectorizer(stop_words=STOPWORDS_LIST or 'english', ngram_range=(1,2))
    tfidf = vec.fit_transform([text]).toarray().flatten()
    feats = vec.get_feature_names_out()
    idxs = tfidf.argsort()[-top_n:][::-1]
    return [feats[i] for i in idxs]
