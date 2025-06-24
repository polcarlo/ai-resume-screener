from flask import Flask, render_template
from db import init_db
from routes.jobs import jobs_bp
from routes.candidates import candidates_bp
from routes.uploads import uploads_bp

def create_app():
    app = Flask(__name__, template_folder='templates')
    app.config['UPLOAD_FOLDER'] = 'uploads'

    init_db(app)

    app.register_blueprint(jobs_bp)
    app.register_blueprint(candidates_bp)
    app.register_blueprint(uploads_bp)

    @app.route('/')
    def index():
        return render_template('index.html')

    return app

if __name__ == '__main__':
    create_app().run(host='0.0.0.0', port=5000, debug=True)
