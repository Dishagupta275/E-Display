import os
from datetime import timedelta

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or "mysql+pymysql://un5vkvgejivvhwbs:UaEp5v4hU7gO86PMHzjM@b1lqmscvxwjozqdwvlzz-mysql.services.clever-cloud.com:3306/b1lqmscvxwjozqdwvlzz"
    # ... rest stays the same
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-secret-key-change-in-production-12345'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # Upload Configuration
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # CORS Configuration
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174']


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
