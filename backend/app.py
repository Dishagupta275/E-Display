import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from config import config
from models import db, Department, User, PeriodTiming, Device
from routes import register_blueprints
from mqtt_publisher import mqtt_publisher
from datetime import datetime, time

def create_app(config_name='production'):
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # ✅ CORS configuration explicitly allowing your exact frontend domain
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "https://e-dispy-publisher.onrender.com",  # Your production frontend
                "http://localhost:3000",                  # Local React/Vue development
                "http://127.0.0.1:3000",
                "http://localhost:5173",                  # Local Vite development
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Headers"]
        }
    })
    
    # Initialize extensions
    db.init_app(app)
    JWTManager(app)
    migrate = Migrate(app, db)
    
    # Register blueprints
    register_blueprints(app)
    
    # Create uploads folder
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        return {"status": "success"}

    # Serve uploaded files
    @app.route('/uploads/<filename>')
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    # Health check endpoint
    @app.route('/', methods=['GET'])
    def health_check():
        return {'status': 'E-Display Backend Running', 'version': '1.0'}, 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        return {'message': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        db.session.rollback()
        return {'message': 'Internal server error'}, 500

    # Create tables and seed data here under app context
    with app.app_context():
        db.create_all()
        seed_data()

    # ✅ FIX: Connect MQTT safely so authorization failures (Code 5) do not crash the container
    try:
        print("Connecting to HiveMQ MQTT broker...")
        mqtt_publisher.connect()
    except Exception as e:
        print(f"⚠️ MQTT Connection bypassed during startup due to error: {str(e)}")

    return app


def seed_data():
    """Seed initial data on first startup"""
    
    # Check if departments already exist — if yes, skip seeding
    if Department.query.first() is not None:
        return
    
    try:
        # Create departments
        departments_data = ['CSE', 'ECE', 'MECH', 'DS']
        departments = {}
        
        for dept_name in departments_data:
            dept = Department(name=dept_name)
            db.session.add(dept)
            db.session.flush()
            departments[dept_name] = dept
        
        # Create principal account
        principal = User(
            name='Principal',
            email='principal@edisplay.com',
            role='principal',
            is_active=True
        )
        principal.set_password('Principal@123')
        db.session.add(principal)
        
        # Create default period timings
        timings_data = [
            {'period': 1, 'start': '09:00', 'end': '10:00', 'label': None},
            {'period': 2, 'start': '10:00', 'end': '10:50', 'label': None},
            {'period': 3, 'start': '10:50', 'end': '11:00', 'label': 'Break'},
            {'period': 4, 'start': '11:00', 'end': '11:50', 'label': None},
            {'period': 5, 'start': '11:50', 'end': '12:40', 'label': None},
            {'period': 6, 'start': '12:40', 'end': '13:30', 'label': 'Lunch'},
            {'period': 7, 'start': '13:30', 'end': '14:20', 'label': None},
            {'period': 8, 'start': '14:20', 'end': '15:10', 'label': None},
            {'period': 9, 'start': '15:10', 'end': '16:00', 'label': None},
        ]
        
        for timing_data in timings_data:
            timing = PeriodTiming(
                period_number=timing_data['period'],
                start_time=datetime.strptime(timing_data['start'], '%H:%M').time(),
                end_time=datetime.strptime(timing_data['end'], '%H:%M').time(),
                label=timing_data.get('label')
            )
            db.session.add(timing)
        
        db.session.commit()
        print("✓ Database seeded with initial data")
    
    except Exception as e:
        db.session.rollback()
        print(f"✗ Error seeding data: {str(e)}")


# Create app instance for Flask CLI and gunicorn
app = create_app(os.environ.get('FLASK_ENV', 'production'))


if __name__ == '__main__':
    # Only runs locally with: python app.py
    app.run(debug=True, host='0.0.0.0', port=5000)
