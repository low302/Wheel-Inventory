import React, { useState, useEffect, useRef } from 'react';

const API_URL = '/api';

function App() {
  const [wheels, setWheels] = useState([]);
  const [summary, setSummary] = useState({ availableCount: 0, soldCount: 0, availableValue: 0, soldValue: 0 });
  const [activeTab, setActiveTab] = useState('available');
  const [showModal, setShowModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelFilter, setModelFilter] = useState('');
  const barcodeRef = useRef(null);
  const [formData, setFormData] = useState({
    part_number: '',
    size: '',
    offset: '',
    model: '',
    year: '',
    finish: '',
    grade: '',
    retail_price: ''
  });

  useEffect(() => {
    fetchWheels();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (showBarcodeModal && selectedWheel && barcodeRef.current) {
      generateBarcode();
    }
  }, [showBarcodeModal, selectedWheel]);

  const generateBarcode = () => {
    if (!selectedWheel || !barcodeRef.current) return;

    try {
      const sku = selectedWheel.sku;
      
      if (!/^\d{12}$/.test(sku)) {
        console.error('Invalid SKU format for barcode:', sku);
        return;
      }

      window.JsBarcode(barcodeRef.current, sku, {
        format: 'UPC',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 20,
        margin: 10
      });
    } catch (err) {
      console.error('Barcode generation error:', err);
    }
  };

  const handleSKUClick = (wheel) => {
    setSelectedWheel(wheel);
    setShowBarcodeModal(true);
  };

  const handleSaveBarcodeLabel = async () => {
    const labelElement = document.getElementById('barcode-label');
    
    if (!labelElement) return;

    try {
      const canvas = await window.html2canvas(labelElement, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [4, 3]
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 4, 3);
      pdf.save(`barcode-label-${selectedWheel.sku}.pdf`);
    } catch (err) {
      console.error('Error saving PDF:', err);
      alert('Error saving PDF. Please try again.');
    }
  };

  const fetchWheels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/wheels`);
      if (!response.ok) throw new Error('Failed to fetch wheels');
      const data = await response.json();
      setWheels(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/summary`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/wheels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add wheel');
      }
      
      await fetchWheels();
      await fetchSummary();
      setShowModal(false);
      setFormData({
        part_number: '',
        size: '',
        offset: '',
        model: '',
        year: '',
        finish: '',
        grade: '',
        retail_price: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this wheel?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/wheels/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete wheel');
      await fetchWheels();
      await fetchSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'sold' : 'available';
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/wheels/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      await fetchWheels();
      await fetchSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintLabel = (id) => {
    window.open(`${API_URL}/wheels/${id}/label`, '_blank');
  };

  const handlePrintInvoice = (id) => {
    window.open(`${API_URL}/wheels/${id}/invoice`, '_blank');
  };

  // Get unique models for filter dropdown
  const uniqueModels = [...new Set(wheels.map(wheel => wheel.model))].sort();

  // Filter wheels by status and model
  const filteredWheels = wheels.filter(wheel => {
    const statusMatch = wheel.status === activeTab;
    const modelMatch = !modelFilter || wheel.model === modelFilter;
    return statusMatch && modelMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">🚗 OEM Subaru Wheel Inventory</h1>
          <p className="text-blue-100 mt-1">Professional Inventory Management System v2.1 - Intelligent UPC-A</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards - Only 2 now */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Available</p>
                <p className="text-3xl font-bold text-gray-800">{summary.availableCount || 0}</p>
                <p className="text-green-600 text-sm font-semibold mt-1">${(summary.availableValue || 0).toFixed(2)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Sold</p>
                <p className="text-3xl font-bold text-gray-800">{summary.soldCount || 0}</p>
                <p className="text-blue-600 text-sm font-semibold mt-1">${(summary.soldValue || 0).toFixed(2)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('available')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  activeTab === 'available'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Available ({summary.availableCount || 0})
              </button>
              <button
                onClick={() => setActiveTab('sold')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  activeTab === 'sold'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sold ({summary.soldCount || 0})
              </button>
            </div>

            {/* Model Filter and Add Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by Model:</label>
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Models</option>
                  {uniqueModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                {modelFilter && (
                  <button
                    onClick={() => setModelFilter('')}
                    className="text-gray-400 hover:text-gray-600"
                    title="Clear filter"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 shadow-md transition-all flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add New Wheel</span>
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading...</p>
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UPC-A SKU
                      <div className="text-xs text-gray-400 normal-case mt-1">(Click for barcode)</div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offset</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finish</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWheels.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        {modelFilter ? `No ${activeTab} wheels found for ${modelFilter}` : `No ${activeTab} wheels found`}
                      </td>
                    </tr>
                  ) : (
                    filteredWheels.map((wheel) => (
                      <tr key={wheel.id} className="hover:bg-gray-50 transition-colors">
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                          onClick={() => handleSKUClick(wheel)}
                          title="Click to view barcode"
                        >
                          {wheel.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wheel.part_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wheel.size}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wheel.offset || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wheel.model}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wheel.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{wheel.finish || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            wheel.grade === 'A' ? 'bg-green-100 text-green-800' :
                            wheel.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {wheel.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${parseFloat(wheel.retail_price).toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handlePrintLabel(wheel.id)}
                              className="text-purple-600 hover:text-purple-900 transition-colors"
                              title="Print Label"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </button>
                            {wheel.status === 'sold' && (
                              <button
                                onClick={() => handlePrintInvoice(wheel.id)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Print Invoice"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusToggle(wheel.id, wheel.status)}
                              className={`${
                                wheel.status === 'available'
                                  ? 'text-green-600 hover:text-green-900'
                                  : 'text-blue-600 hover:text-blue-900'
                              } transition-colors`}
                              title={wheel.status === 'available' ? 'Mark as Sold' : 'Mark as Available'}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(wheel.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Barcode Modal - Same as before */}
      {showBarcodeModal && selectedWheel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Barcode Label</h2>
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div id="barcode-label" className="border-2 border-gray-300 rounded-lg p-8 bg-white text-center">
                <div className="my-6 flex justify-center">
                  <svg ref={barcodeRef}></svg>
                </div>

                <div className="space-y-2 text-left max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="font-semibold">Part #:</span>
                    <span>{selectedWheel.part_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Size:</span>
                    <span>{selectedWheel.size}</span>
                  </div>
                  {selectedWheel.offset && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Offset:</span>
                      <span>{selectedWheel.offset}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-semibold">Model:</span>
                    <span>{selectedWheel.model} {selectedWheel.year}</span>
                  </div>
                  {selectedWheel.finish && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Finish:</span>
                      <span>{selectedWheel.finish}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-semibold">Grade:</span>
                    <span>{selectedWheel.grade}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveBarcodeLabel}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium shadow-md transition-all flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Save as PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Wheel Modal - Same as before */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add New Wheel</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Part Number *</label>
                    <input
                      type="text"
                      name="part_number"
                      value={formData.part_number}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="68811"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size *</label>
                    <input
                      type="text"
                      name="size"
                      value={formData.size}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="17x7.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Offset</label>
                    <input
                      type="text"
                      name="offset"
                      value={formData.offset}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="55 (+ will be added automatically)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Crosstrek"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="2018"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Finish</label>
                    <input
                      type="text"
                      name="finish"
                      value={formData.finish}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Silver"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade *</label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Grade</option>
                      <option value="A">A - Excellent</option>
                      <option value="B">B - Good</option>
                      <option value="C">C - Fair</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Retail Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="retail_price"
                      value={formData.retail_price}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="150.00"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md transition-all disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Wheel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <p>© 2025 Wheel Inventory System v2.1 - Intelligent UPC-A</p>
            <div className="flex space-x-4">
              <span>✅ Automated Backups</span>
              <span>⚡ Redis Caching</span>
              <span>📋 PDF Labels</span>
              <span>🔲 Smart Barcodes</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
