from app import app, db
from models import Class, TimetableSlot, Department

with app.app_context():
    try:
        dept = Department.query.get(1)
        print('Dept found:', dept.name)
        
        c = Class(
            department_id=1, 
            year=2, 
            section='A', 
            display_name='CSE-2A', 
            room_number='B201'
        )
        db.session.add(c)
        db.session.flush()
        print('Class ID:', c.id)
        
        slot = TimetableSlot(
            class_id=c.id, 
            day='Monday', 
            period_number=1, 
            slot_type='free'
        )
        db.session.add(slot)
        db.session.commit()
        print('Success!')
        
    except Exception as e:
        print('ERROR:', str(e))
        db.session.rollback()