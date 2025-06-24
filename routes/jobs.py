from flask import Blueprint, jsonify
import json
from db import get_db

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('/api/jobs')
def list_jobs():
    db = get_db()
    rows = db.execute(
        'SELECT j.id, j.filename, j.title, j.created_at, '
        'COUNT(c.id) AS candidate_count, MAX(c.similarity_pct) AS top_match '
        'FROM jobs j LEFT JOIN candidates c ON j.id=c.job_id '
        'GROUP BY j.id ORDER BY j.created_at DESC'
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@jobs_bp.route('/api/jobs/<int:job_id>/candidates')
def job_candidates(job_id):
    db = get_db()
    rows = db.execute(
        'SELECT c.*, cn.name, j.title AS job_title '
        'FROM candidates c '
        'JOIN candidate_names cn ON c.filename=cn.filename '
        'JOIN jobs j ON c.job_id=j.id '
        'WHERE job_id=? ORDER BY similarity_pct DESC', (job_id,)
    ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        for f in ['skills','experience','education','certifications','keywords']:
            d[f] = json.loads(d[f]) if d[f] else []
        result.append(d)
    return jsonify(result)