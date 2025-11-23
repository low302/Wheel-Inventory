import React from 'react';

function WheelList({ wheels, onDelete, onShowLabel, onSearch, searchQuery, loading }) {
  return (
    <div className="wheel-list">
      <h2>Inventory ({wheels.length} items)</h2>
      
      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 Search by SKU, model, year, or location..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">⏳ Loading...</div>
      ) : wheels.length === 0 ? (
        <div className="no-wheels">
          <div className="no-wheels-icon">📦</div>
          <p>{searchQuery ? 'No wheels found matching your search' : 'No wheels in inventory yet'}</p>
        </div>
      ) : (
        <div className="wheels-grid">
          {wheels.map(wheel => (
            <div key={wheel.id} className="wheel-card">
              <div className="wheel-header">
                <div className="wheel-title">
                  <span className="wheel-sku">{wheel.sku}</span>
                  <h3>{wheel.year} {wheel.make} {wheel.model}</h3>
                </div>
              </div>

              <div className="wheel-info">
                <div className="info-item">
                  <span className="info-label">Size</span>
                  <span className="info-value">{wheel.wheel_size}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Condition</span>
                  <span className="info-value">{wheel.condition}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Bolt Pattern</span>
                  <span className="info-value">{wheel.bolt_pattern || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Offset</span>
                  <span className="info-value">{wheel.offset || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Quantity</span>
                  <span className="info-value">{wheel.quantity}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Location</span>
                  <span className="info-value">{wheel.location || 'Not set'}</span>
                </div>
              </div>

              {wheel.notes && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#edf2f7', borderRadius: '6px' }}>
                  <span className="info-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Notes</span>
                  <span style={{ fontSize: '0.9rem', color: '#2d3748' }}>{wheel.notes}</span>
                </div>
              )}

              <div className="wheel-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => onShowLabel(wheel)}
                >
                  🏷️ Label
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => onDelete(wheel.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WheelList;
