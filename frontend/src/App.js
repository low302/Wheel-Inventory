import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import WheelForm from './components/WheelForm';
import WheelList from './components/WheelList';
import LabelModal from './components/LabelModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [wheels, setWheels] = useState([]);
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWheels();
  }, []);

  const fetchWheels = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/wheels`);
      setWheels(response.data);
    } catch (error) {
      console.error('Error fetching wheels:', error);
      alert('Failed to fetch wheels');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWheel = async (wheelData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/wheels`, wheelData);
      setWheels([response.data, ...wheels]);
      alert('Wheel added successfully!');
    } catch (error) {
      console.error('Error adding wheel:', error);
      alert('Failed to add wheel');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWheel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this wheel?')) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/wheels/${id}`);
      setWheels(wheels.filter(wheel => wheel.id !== id));
      alert('Wheel deleted successfully!');
    } catch (error) {
      console.error('Error deleting wheel:', error);
      alert('Failed to delete wheel');
    } finally {
      setLoading(false);
    }
  };

  const handleShowLabel = (wheel) => {
    setSelectedWheel(wheel);
    setShowLabelModal(true);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchWheels();
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/wheels/search/${query}`);
      setWheels(response.data);
    } catch (error) {
      console.error('Error searching wheels:', error);
      alert('Failed to search wheels');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="container">
          <h1>🚗 OEM Wheel Inventory System</h1>
          <p>Subaru OEM Wheels (2019-2026)</p>
        </div>
      </header>

      <main className="container">
        <div className="main-grid">
          <div className="form-section">
            <WheelForm onSubmit={handleAddWheel} loading={loading} />
          </div>

          <div className="list-section">
            <WheelList
              wheels={wheels}
              onDelete={handleDeleteWheel}
              onShowLabel={handleShowLabel}
              onSearch={handleSearch}
              searchQuery={searchQuery}
              loading={loading}
            />
          </div>
        </div>
      </main>

      {showLabelModal && selectedWheel && (
        <LabelModal
          wheel={selectedWheel}
          onClose={() => setShowLabelModal(false)}
        />
      )}
    </div>
  );
}

export default App;
