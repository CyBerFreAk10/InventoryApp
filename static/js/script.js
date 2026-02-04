// Tab switching
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
    });
});

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadRawMaterials();
    loadFoodItems();
});

// Raw Materials Functions
async function loadRawMaterials() {
    try {
        const response = await fetch('/api/raw-materials');
        const materials = await response.json();
        
        const grid = document.getElementById('raw-materials-grid');
        
        if (materials.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z"/>
                    </svg>
                    <p>No raw materials yet</p>
                    <p class="empty-state-subtitle">Start by adding your first item</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = materials.map(material => createMaterialCard(material)).join('');
    } catch (error) {
        console.error('Error loading raw materials:', error);
        showNotification('Failed to load raw materials', 'error');
    }
}

function createMaterialCard(material) {
    const isLowStock = material.quantity < 10;
    const canEdit = userType === 'admin';
    
    return `
        <div class="inventory-card" data-id="${material.id}">
            <div class="card-header">
                <h3 class="card-title">${material.name}</h3>
                ${canEdit ? `
                <button class="btn-icon-delete" onclick="deleteMaterial(${material.id})" aria-label="Delete ${material.name}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                    </svg>
                </button>
                ` : ''}
            </div>
            <div class="card-body">
                <div class="quantity-display ${isLowStock ? 'low-stock' : ''}">
                    <span class="quantity-number">${material.quantity}</span>
                    <span class="quantity-unit">${material.unit}</span>
                </div>
                ${isLowStock ? '<span class="stock-badge low">Low Stock</span>' : '<span class="stock-badge">In Stock</span>'}
            </div>
            <div class="card-footer">
                <div class="quantity-controls">
                    <button class="btn-quantity" onclick="adjustMaterialQuantity(${material.id}, -1)" aria-label="Decrease quantity">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M5 12h14"/>
                        </svg>
                    </button>
                    <button class="btn-quantity" onclick="adjustMaterialQuantity(${material.id}, 1)" aria-label="Increase quantity">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                    </button>
                </div>
                <div class="last-updated">Updated: ${formatDate(material.last_updated)}</div>
            </div>
        </div>
    `;
}

// UPDATED: Use atomic adjustment endpoint instead of reading then writing
async function adjustMaterialQuantity(id, adjustment) {
    try {
        const response = await fetch(`/api/raw-materials/${id}/adjust`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ adjustment })
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 400) {
                showNotification('Cannot reduce quantity below zero', 'error');
            } else {
                throw new Error(error.error || 'Failed to update quantity');
            }
            return;
        }
        
        const updatedMaterial = await response.json();
        
        // Update the card in the UI
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) {
            const quantityDisplay = card.querySelector('.quantity-number');
            const stockBadge = card.querySelector('.stock-badge');
            const lastUpdated = card.querySelector('.last-updated');
            const quantityDisplayContainer = card.querySelector('.quantity-display');
            
            quantityDisplay.textContent = updatedMaterial.quantity;
            lastUpdated.textContent = `Updated: ${formatDate(updatedMaterial.last_updated)}`;
            
            // Update stock status
            if (updatedMaterial.quantity < 10) {
                stockBadge.textContent = 'Low Stock';
                stockBadge.classList.add('low');
                quantityDisplayContainer.classList.add('low-stock');
            } else {
                stockBadge.textContent = 'In Stock';
                stockBadge.classList.remove('low');
                quantityDisplayContainer.classList.remove('low-stock');
            }
            
            // Visual feedback
            card.style.transform = 'scale(1.02)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);
        }
        
        showNotification('Quantity updated successfully', 'success');
    } catch (error) {
        console.error('Error adjusting quantity:', error);
        showNotification('Failed to update quantity', 'error');
    }
}

async function deleteMaterial(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/raw-materials/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Item deleted successfully', 'success');
            loadRawMaterials();
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        showNotification('Failed to delete item', 'error');
    }
}

// Food Items Functions
async function loadFoodItems() {
    try {
        const response = await fetch('/api/food-items');
        const items = await response.json();
        
        const grid = document.getElementById('food-items-grid');
        
        if (items.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/>
                    </svg>
                    <p>No food items yet</p>
                    <p class="empty-state-subtitle">Start by adding your first item</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = items.map(item => createFoodCard(item)).join('');
    } catch (error) {
        console.error('Error loading food items:', error);
        showNotification('Failed to load food items', 'error');
    }
}

function createFoodCard(item) {
    const isLowStock = item.quantity < 5;
    const canEdit = userType === 'admin';
    
    const categoryEmojis = {
        'Appetizer': '🥗',
        'Main Course': '🍛',
        'Dessert': '🍰',
        'Beverage': '🥤',
        'Snack': '🍿',
        'Salad': '🥙',
        'Soup': '🍜',
        'Other': '📦'
    };
    
    return `
        <div class="inventory-card" data-id="${item.id}">
            <div class="card-header">
                <h3 class="card-title">${item.name}</h3>
                ${canEdit ? `
                <button class="btn-icon-delete" onclick="deleteFoodItem(${item.id})" aria-label="Delete ${item.name}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                    </svg>
                </button>
                ` : ''}
            </div>
            <div class="card-body">
                <div class="category-badge">
                    <span class="category-emoji">${categoryEmojis[item.category] || '📦'}</span>
                    ${item.category}
                </div>
                <div class="quantity-display ${isLowStock ? 'low-stock' : ''}">
                    <span class="quantity-number">${item.quantity}</span>
                    <span class="quantity-unit">servings</span>
                </div>
                ${isLowStock ? '<span class="stock-badge low">Low Stock</span>' : '<span class="stock-badge">In Stock</span>'}
            </div>
            <div class="card-footer">
                <div class="quantity-controls">
                    <button class="btn-quantity" onclick="adjustFoodQuantity(${item.id}, -1)" aria-label="Decrease quantity">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M5 12h14"/>
                        </svg>
                    </button>
                    <button class="btn-quantity" onclick="adjustFoodQuantity(${item.id}, 1)" aria-label="Increase quantity">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                    </button>
                </div>
                <div class="last-updated">Updated: ${formatDate(item.last_updated)}</div>
            </div>
        </div>
    `;
}

// UPDATED: Use atomic adjustment endpoint instead of reading then writing
async function adjustFoodQuantity(id, adjustment) {
    try {
        const response = await fetch(`/api/food-items/${id}/adjust`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ adjustment })
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 400) {
                showNotification('Cannot reduce quantity below zero', 'error');
            } else {
                throw new Error(error.error || 'Failed to update quantity');
            }
            return;
        }
        
        const updatedItem = await response.json();
        
        // Update the card in the UI
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) {
            const quantityDisplay = card.querySelector('.quantity-number');
            const stockBadge = card.querySelector('.stock-badge');
            const lastUpdated = card.querySelector('.last-updated');
            const quantityDisplayContainer = card.querySelector('.quantity-display');
            
            quantityDisplay.textContent = updatedItem.quantity;
            lastUpdated.textContent = `Updated: ${formatDate(updatedItem.last_updated)}`;
            
            // Update stock status
            if (updatedItem.quantity < 5) {
                stockBadge.textContent = 'Low Stock';
                stockBadge.classList.add('low');
                quantityDisplayContainer.classList.add('low-stock');
            } else {
                stockBadge.textContent = 'In Stock';
                stockBadge.classList.remove('low');
                quantityDisplayContainer.classList.remove('low-stock');
            }
            
            // Visual feedback
            card.style.transform = 'scale(1.02)';
            setTimeout(() => {
                card.style.transform = '';
            }, 200);
        }
        
        showNotification('Quantity updated successfully', 'success');
    } catch (error) {
        console.error('Error adjusting quantity:', error);
        showNotification('Failed to update quantity', 'error');
    }
}

async function deleteFoodItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/food-items/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Item deleted successfully', 'success');
            loadFoodItems();
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showNotification('Failed to delete item', 'error');
    }
}

// Modal Functions
function showAddMaterialModal() {
    document.getElementById('addMaterialModal').classList.add('active');
}

function showAddFoodModal() {
    document.getElementById('addFoodModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Form Submissions
document.getElementById('addMaterialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        quantity: parseFloat(formData.get('quantity')),
        unit: formData.get('unit')
    };
    
    try {
        const response = await fetch('/api/raw-materials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showNotification('Raw material added successfully', 'success');
            closeModal('addMaterialModal');
            e.target.reset();
            loadRawMaterials();
        }
    } catch (error) {
        console.error('Error adding material:', error);
        showNotification('Failed to add material', 'error');
    }
});

document.getElementById('addFoodForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        quantity: parseInt(formData.get('quantity')),
        category: formData.get('category')
    };
    
    try {
        const response = await fetch('/api/food-items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showNotification('Food item added successfully', 'success');
            closeModal('addFoodModal');
            e.target.reset();
            loadFoodItems();
        }
    } catch (error) {
        console.error('Error adding food item:', error);
        showNotification('Failed to add food item', 'error');
    }
});

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ⓘ'}
            </span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}