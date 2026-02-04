# Inventory Management System

A local web-based inventory management system for tracking raw materials and food items with user authentication and role-based access control.

## Features

- **User Authentication**: Two-level access (Admin and User)
- **Raw Materials Management**: Track provisions and raw materials with quantities and units
- **Food Items Management**: Track prepared food items with categories
- **Role-Based Permissions**:
  - Admin: Add, update, and delete items
  - User: View and update quantities only
- **Persistent Storage**: SQLite database keeps all data saved between sessions
- **Local Network Access**: Accessible from any device on the same network
- **Real-time Updates**: Changes are immediately saved and reflected

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd inventory_app
pip install -r requirements.txt
```

Or install manually:
```bash
pip install Flask Flask-SQLAlchemy
```

### 2. Run the Application

```bash
python app.py
```

The server will start on `http://0.0.0.0:5000`

### 3. Access the Application

- **From the same computer**: Open browser and go to `http://localhost:5000`
- **From other devices on the network**: 
  1. Find your computer's IP address:
     - Windows: Run `ipconfig` in command prompt (look for IPv4 Address)
     - Mac/Linux: Run `ifconfig` or `ip addr` in terminal
  2. On other devices, open browser and go to `http://YOUR_IP:5000`
     - Example: `http://192.168.1.100:5000`

## Default Login Credentials

- **Admin Password**: `admin123`
- **User Password**: `user123`

⚠️ **Important**: Change these passwords in `app.py` before deployment:
```python
ADMIN_PASSWORD = "your-secure-admin-password"
USER_PASSWORD = "your-secure-user-password"
```

## Usage Guide

### Admin Functions
- Add new raw materials and food items
- Delete items from inventory
- Update quantities

### User Functions
- View all inventory items
- Update quantities of existing items

### Raw Materials Tab
- Track raw materials like flour, sugar, oil, etc.
- Set quantities with appropriate units (kg, L, pieces, etc.)
- View last updated timestamp

### Food Items Tab
- Track prepared food items
- Categorize items (Appetizer, Main Course, Dessert, etc.)
- Monitor quantities available

## File Structure

```
inventory_app/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── inventory.db               # SQLite database (created automatically)
├── templates/
│   ├── login.html             # Login page
│   └── dashboard.html         # Main dashboard with tabs
└── static/
    ├── css/
    │   └── style.css          # All styling
    └── js/
        └── script.js          # Frontend JavaScript
```

## Database

The application uses SQLite database (`inventory.db`) which is created automatically on first run. All data persists even when the server is stopped.

### Database Tables

1. **RawMaterial**
   - id, name, quantity, unit, last_updated

2. **FoodItem**
   - id, name, quantity, category, last_updated

## Troubleshooting

### Cannot access from other devices
- Make sure all devices are on the same WiFi network
- Check firewall settings and allow port 5000
- Verify the IP address is correct

### Database errors
- Delete `inventory.db` and restart the application to create a fresh database

### Port already in use
- Change the port in `app.py`: `app.run(host='0.0.0.0', port=5001, debug=True)`

## Security Notes

- This application is designed for local network use only
- Change default passwords before use
- Do not expose to the public internet without proper security measures
- The SECRET_KEY in app.py should be changed to a random string

## Customization

### Adding More Categories
Edit the category dropdown in `templates/dashboard.html`:
```html
<option value="Your Category">Your Category</option>
```

### Adding More Units
Edit the unit dropdown in `templates/dashboard.html`:
```html
<option value="units">Units Description</option>
```

### Changing Colors
Modify CSS variables in `static/css/style.css`:
```css
:root {
    --primary-color: #2563eb;  /* Change this */
    --danger-color: #ef4444;   /* Change this */
}
```
