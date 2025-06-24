import os
import json
from flask import send_from_directory, Blueprint, request, jsonify, current_app
from datetime import datetime
from werkzeug.utils import secure_filename
from db import get_db
from utils import (
    allowed_file,
    extract_text,
    preprocess_text,
    extract_name,
    extract_entities,
    calc_similarity,
    extract_keywords
)

uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/upload_job', methods=['POST'])
def upload_job():
    file = request.files.get('job_desc')
    if not file:
        return jsonify(error='No file part'), 400
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify(error='Invalid file'), 400

    fname = secure_filename(file.filename)
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    path = os.path.join(upload_folder, fname)
    file.save(path)

    db = get_db()
    ts = datetime.utcnow().isoformat()
    cursor = db.cursor()
    cursor.execute(
        'INSERT INTO jobs(filename, created_at, title) VALUES (?, ?, ?)',
        (fname, ts, request.form.get('job_title', ''))
    )
    db.commit()
    jid = cursor.lastrowid

    return jsonify(
        id=jid,
        filename=fname,
        title=request.form.get('job_title', ''),
        created_at=ts
    ), 201


@uploads_bp.route('/upload_resumes', methods=['POST'])
def upload_resumes():
    job_id = request.form.get('job_id')
    if not job_id:
        return jsonify(error='Missing job ID'), 400

    db = get_db()
    job = db.execute('SELECT * FROM jobs WHERE id = ?', (job_id,)).fetchone()
    if not job:
        return jsonify(error='Job not found'), 404

    upload_folder = current_app.config['UPLOAD_FOLDER']
    job_path = os.path.join(upload_folder, job['filename'])
    job_text = extract_text(job_path)
    clean_job = preprocess_text(job_text)

    candidates = []
    for resume_file in request.files.getlist('resumes'):
        if resume_file.filename == '':
            continue
        if not allowed_file(resume_file.filename):
            continue

        try:
            filename = secure_filename(resume_file.filename)
            filepath = os.path.join(upload_folder, filename)
            resume_file.save(filepath)

            resume_text = extract_text(filepath)
            clean_resume = preprocess_text(resume_text)
            similarity = calc_similarity(clean_job, clean_resume)

            name = extract_name(resume_text)
            if not name:
                name = os.path.splitext(filename)[0].replace('_', ' ').title()

            db.execute(
                'INSERT OR IGNORE INTO candidate_names (filename, name) VALUES (?, ?)',
                (filename, name)
            )

            skills, experience, education, certifications = extract_entities(resume_text)
            keywords = extract_keywords(resume_text)

            db.execute('''
                INSERT INTO candidates (
                    job_id,
                    filename,
                    similarity_pct,
                    skills,
                    experience,
                    education,
                    certifications,
                    keywords
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                job_id,
                filename,
                similarity,
                json.dumps(skills),
                json.dumps(experience),
                json.dumps(education),
                json.dumps(certifications),
                json.dumps(keywords)
            ))
            db.commit()

            candidate_id = db.execute('SELECT last_insert_rowid()').fetchone()[0]
            candidates.append({
                'id': candidate_id,
                'name': name,
                'similarity': similarity,
                'skills': skills,
                'experience': experience,
                'education': education,
                'certifications': certifications,
                'keywords': keywords
            })

        except Exception as e:
            print(f"Error processing {resume_file.filename}: {e}")

    return jsonify(candidates=candidates), 200


@uploads_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
