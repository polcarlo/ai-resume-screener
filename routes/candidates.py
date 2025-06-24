from flask import Blueprint, jsonify, request
import json
from db import get_db

candidates_bp = Blueprint('candidates', __name__)

@candidates_bp.route('/api/candidates')
def all_candidates():
    db = get_db()
    rows = db.execute(
        'SELECT c.*, j.title AS job_title, cn.name '
        'FROM candidates c '
        'JOIN jobs j ON c.job_id=j.id '
        'JOIN candidate_names cn ON c.filename=cn.filename '
        'ORDER BY similarity_pct DESC'
    ).fetchall()
    data = []
    for r in rows:
        d = dict(r)
        for f in ['skills','experience','education','certifications','keywords']:
            d[f] = json.loads(d[f]) if d[f] else []
        data.append(d)
    return jsonify(data)

@candidates_bp.route('/api/analytics/<int:job_id>')
def analytics(job_id):
    db = get_db()
    rows = db.execute('SELECT similarity_pct, skills, reviewed FROM candidates WHERE job_id=?', (job_id,)).fetchall()
    scores = [r['similarity_pct'] for r in rows]
    reviewed = sum(r['reviewed'] for r in rows)
    pending = len(rows) - reviewed
    freq = {}
    for r in rows:
        skills = json.loads(r['skills']) if r['skills'] else []
        for s in skills:
            freq[s] = freq.get(s,0) +1
    top = sorted(freq.items(), key=lambda x:x[1], reverse=True)[:10]
    return jsonify({
        'similarity_scores': scores,
        'reviewed_count': reviewed,
        'pending_count': pending,
        'top_skills': top,
        'candidate_count': len(rows)
    })

@candidates_bp.route('/api/mark_reviewed', methods=['POST'])
def mark_reviewed():
    data = request.get_json()
    cid = data.get('candidate_id')
    if not cid:
        return jsonify(error='Missing candidate_id'), 400
    state = 1 if data.get('reviewed', True) else 0
    db = get_db()
    db.execute('UPDATE candidates SET reviewed=? WHERE id=?', (state, cid))
    db.commit()
    return jsonify(success=True)