import os
from datetime import timedelta


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        "mysql+pymysql://un5vkvgejivvhwbs:UaEp5v4hU7gO86PMHzjM@b1lqmscvxwjozqdwvlzz-mysql.services.clever-cloud.com:3306/b1lqmscvxwjozqdwvlzz"
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-secret-key-change-in-production-12345'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    CORS_ORIGINS = [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://e-display-publisher.onrender.com',
        'https://e-display-subscriber.onrender.com'
    ]
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
