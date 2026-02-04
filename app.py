from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# This looks for the variable you just set in Vercel
# If it doesn't find it (like on your local PC), it falls back to SQLite
database_url = os.environ.get('DATABASE_URL')

if database_url:
    # SQL Alchemy fix for 'postgres://' vs 'postgresql://'
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///inventory.db'

# Crucial for Neon to prevent connection timeouts
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,
}

db = SQLAlchemy(app)

# Authentication credentials
ADMIN_PASSWORD = "admin123"
USER_PASSWORD = "user123"

# Database Models
class RawMaterial(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(50), nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'last_updated': self.last_updated.strftime('%Y-%m-%d %H:%M:%S')
        }

class FoodItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'category': self.category,
            'last_updated': self.last_updated.strftime('%Y-%m-%d %H:%M:%S')
        }

# Create database tables
with app.app_context():
    db.create_all()

# Routes
@app.route('/')
def index():
    if 'user_type' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    password = request.form.get('password')
    
    if password == ADMIN_PASSWORD:
        session.permanent = True
        session['user_type'] = 'admin'
        return redirect(url_for('dashboard'))
    elif password == USER_PASSWORD:
        session.permanent = True
        session['user_type'] = 'user'
        return redirect(url_for('dashboard'))
    else:
        return render_template('login.html', error='Invalid password')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if 'user_type' not in session:
        return redirect(url_for('index'))
    return render_template('dashboard.html', user_type=session['user_type'])

# Raw Materials API
@app.route('/api/raw-materials', methods=['GET'])
def get_raw_materials():
    if 'user_type' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    materials = RawMaterial.query.all()
    return jsonify([material.to_dict() for material in materials])

@app.route('/api/raw-materials', methods=['POST'])
def add_raw_material():
    if 'user_type' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    material = RawMaterial(
        name=data['name'],
        quantity=data['quantity'],
        unit=data['unit']
    )
    db.session.add(material)
    db.session.commit()
    return jsonify(material.to_dict()), 201

# NEW: Atomic increment/decrement for raw materials
@app.route('/api/raw-materials/<int:id>/adjust', methods=['POST'])
def adjust_raw_material(id):
    if 'user_type' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    adjustment = data.get('adjustment', 0)  # Positive to add, negative to subtract
    
    # Use raw SQL for atomic operation
    result = db.session.execute(
        db.text("""
            UPDATE raw_material 
            SET quantity = quantity + :adjustment,
                last_updated = :now
            WHERE id = :id AND quantity + :adjustment >= 0
        """),
        {
            'adjustment': adjustment,
            'now': datetime.utcnow(),
            'id': id
        }
    )
    db.session.commit()
    
    # Check if update was successful
    if result.rowcount == 0:
        # Either item doesn't exist or would go negative
        material = RawMaterial.query.get(id)
        if not material:
            return jsonify({'error': 'Item not found'}), 404
        else:
            return jsonify({'error': 'Insufficient quantity'}), 400
    
    # Fetch and return updated material
    material = RawMaterial.query.get(id)
    return jsonify(material.to_dict())

@app.route('/api/raw-materials/<int:id>', methods=['PUT'])
def update_raw_material(id):
    if 'user_type' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    material = RawMaterial.query.get_or_404(id)
    data = request.json
    
    # For direct updates (like manual entry), still allow setting exact value
    material.quantity = data['quantity']
    material.last_updated = datetime.utcnow()
    db.session.commit()
    return jsonify(material.to_dict())

@app.route('/api/raw-materials/<int:id>', methods=['DELETE'])
def delete_raw_material(id):
    if 'user_type' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    material = RawMaterial.query.get_or_404(id)
    db.session.delete(material)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'})

# Food Items API
@app.route('/api/food-items', methods=['GET'])
def get_food_items():
    if 'user_type' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    items = FoodItem.query.all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/food-items', methods=['POST'])
def add_food_item():
    if 'user_type' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    item = FoodItem(
        name=data['name'],
        quantity=data['quantity'],
        category=data['category']
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

# NEW: Atomic increment/decrement for food items
@app.route('/api/food-items/<int:id>/adjust', methods=['POST'])
def adjust_food_item(id):
    if 'user_type' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    adjustment = data.get('adjustment', 0)  # Positive to add, negative to subtract
    
    # Use raw SQL for atomic operation
    result = db.session.execute(
        db.text("""
            UPDATE food_item 
            SET quantity = quantity + :adjustment,
                last_updated = :now
            WHERE id = :id AND quantity + :adjustment >= 0
        """),
        {
            'adjustment': adjustment,
            'now': datetime.utcnow(),
            'id': id
        }
    )
    db.session.commit()
    
    # Check if update was successful
    if result.rowcount == 0:
        # Either item doesn't exist or would go negative
        item = FoodItem.query.get(id)
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        else:
            return jsonify({'error': 'Insufficient quantity'}), 400
    
    # Fetch and return updated item
    item = FoodItem.query.get(id)
    return jsonify(item.to_dict())

@app.route('/api/food-items/<int:id>', methods=['PUT'])
def update_food_item(id):
    if 'user_type' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    item = FoodItem.query.get_or_404(id)
    data = request.json
    
    # For direct updates (like manual entry), still allow setting exact value
    item.quantity = data['quantity']
    item.last_updated = datetime.utcnow()
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/food-items/<int:id>', methods=['DELETE'])
def delete_food_item(id):
    if 'user_type' not in session or session['user_type'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    item = FoodItem.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'})

if __name__ == '__main__':
    # Run on local network - accessible from other devices on same network
    app.run(host='0.0.0.0', port=5000, debug=True)
