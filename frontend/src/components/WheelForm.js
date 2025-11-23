import React, { useState } from 'react';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => currentYear - i + 1);

const subaruModels = [
  'Outback',
  'Forester',
  'Crosstrek',
  'Impreza',
  'Legacy',
  'WRX',
  'BRZ',
  'Ascent',
  'Solterra',
  'WRX STI',
];

const wheelSizes = [
  '15"',
  '16"',
  '17"',
  '18"',
  '19"',
  '20"',
];

const conditions = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
];

function WheelForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    year: '',
    make: 'Subaru',
    model: '',
    wheel_size: '',
    offset: '',
    bolt_pattern: '5x114.3',
    condition: '',
    quantity: 1,
    location: '',
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.year || !formData.model || !formData.wheel_size || !formData.condition) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit(formData);
    
    // Reset form
    setFormData({
      year: '',
      make: 'Subaru',
      model: '',
      wheel_size: '',
      offset: '',
      bolt_pattern: '5x114.3',
      condition: '',
      quantity: 1,
      location: '',
      notes: '',
    });
  };

  return (
    <div className="wheel-form">
      <h2>Add New Wheel</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Year *</label>
            <select
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
            >
              <option value="">Select Year</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Make *</label>
            <input
              type="text"
              name="make"
              value={formData.make}
              onChange={handleChange}
              required
              readOnly
            />
          </div>
        </div>

        <div className="form-group">
          <label>Model *</label>
          <select
            name="model"
            value={formData.model}
            onChange={handleChange}
            required
          >
            <option value="">Select Model</option>
            {subaruModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Wheel Size *</label>
            <select
              name="wheel_size"
              value={formData.wheel_size}
              onChange={handleChange}
              required
            >
              <option value="">Select Size</option>
              {wheelSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Offset</label>
            <input
              type="text"
              name="offset"
              value={formData.offset}
              onChange={handleChange}
              placeholder="e.g., +45mm"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Bolt Pattern</label>
          <input
            type="text"
            name="bolt_pattern"
            value={formData.bolt_pattern}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Condition *</label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
              required
            >
              <option value="">Select Condition</option>
              {conditions.map(condition => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              max="100"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Warehouse A, Shelf 3"
          />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional information..."
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '⏳ Adding...' : '✓ Add to Inventory'}
        </button>
      </form>
    </div>
  );
}

export default WheelForm;
