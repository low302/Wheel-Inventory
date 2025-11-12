import React, { useState, useEffect, useRef } from 'react';

const API_URL = '/api';

function App() {
  const [wheels, setWheels] = useState([]);
  const [summary, setSummary] = useState({ availableCount: 0, soldCount: 0, availableValue: 0, soldValue: 0 });
  const [activeTab, setActiveTab] = useState('available');
  const [showModal, setShowModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelFilter, setModelFilter] = useState('');
  const [scanMode, setScanMode] = useState('usb'); // 'usb' or 'camera'
  const [scannedCode, setScannedCode] = useState('');
  const [scanBuffer, setScanBuffer] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const barcodeRef = useRef(null);
  const videoRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const quaggaInitialized = useRef(false);
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

  // USB Barcode Scanner Handler
  useEffect(() => {
    if (!showScanModal || scanMode !== 'usb') return;

    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Clear previous timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      // USB scanners typically end with Enter key
      if (e.key === 'Enter') {
        if (scanBuffer.length >= 12) { // UPC-A is 12 digits
          handleScannedBarcode(scanBuffer);
          setScanBuffer('');
        }
      } else if (e.key.length === 1) {
        // Add character to buffer
        setScanBuffer(prev => prev + e.key);
        
        // Auto-clear buffer after 100ms of no input (scanner types fast)
        scanTimeoutRef.current = setTimeout(() => {
          setScanBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [showScanModal, scanMode, scanBuffer]);

  const handleScannedBarcode = async (code) => {
    setScannedCode(code);
    setScanStatus('Searching...');
    
    // Search for wheel with this SKU
    const wheel = wheels.find(w => w.sku === code);
    
    if (wheel) {
      setSelectedWheel(wheel);
      setShowScanModal(false);
      setScanStatus('');
      
      // Show a success message
      setError(null);
      alert(`Found wheel: ${wheel.model} ${wheel.year} - ${wheel.size}\nSKU: ${wheel.sku}\nPrice: $${wheel.retail_price}`);
    } else {
      setError(`No wheel found with SKU: ${code}`);
      setScanStatus('Not found');
      setTimeout(() => {
        setError(null);
        setScanStatus('');
      }, 3000);
    }
  };

  // Camera Barcode Scanner with Quagga.js
  const startCameraScanner = async () => {
    if (quaggaInitialized.current) return;
    
    setIsCameraActive(true);
    setScanStatus('Starting camera...');
    
    try {
      // Check if Quagga is available
      if (!window.Quagga) {
        throw new Error('Quagga library not loaded. Please refresh the page.');
      }

      const constraints = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: "environment", // Use back camera on mobile
            aspectRatio: { min: 1, max: 2 }
          }
        },
        decoder: {
          readers: [
            "upc_reader",
            "upc_e_reader",
            "ean_reader"
          ],
          debug: {
            drawBoundingBox: true,
            showFrequency: false,
            drawScanline: true,
            showPattern: false
          },
          multiple: false
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        locate: true,
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 10
      };

      window.Quagga.init(constraints, function(err) {
        if (err) {
          console.error('Quagga initialization error:', err);
          setError('Unable to start camera. Please check permissions and try again.');
          setIsCameraActive(false);
          setScanStatus('');
          return;
        }
        
        console.log("Quagga initialization finished. Ready to start");
        window.Quagga.start();
        quaggaInitialized.current = true;
        setScanStatus('Scanning... Point camera at barcode');
      });

      // Handle detected barcodes
      window.Quagga.onDetected(function(result) {
        if (result && result.codeResult && result.codeResult.code) {
          const code = result.codeResult.code;
          console.log("Barcode detected:", code);
          
          // Only process if it looks like a UPC-A (12 digits)
          if (/^\d{12}$/.test(code)) {
            setScanStatus('Barcode detected!');
            handleScannedBarcode(code);
            stopCameraScanner();
          }
        }
      });

    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions: Settings → Safari → Camera');
      setIsCameraActive(false);
      setScanStatus('');
    }
  };

  const stopCameraScanner = () => {
    if (quaggaInitialized.current && window.Quagga) {
      window.Quagga.stop();
      window.Quagga.offDetected();
      quaggaInitialized.current = false;
    }
    setIsCameraActive(false);
    setScanStatus('');
  };

  useEffect(() => {
    if (showScanModal && scanMode === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      stopCameraScanner();
    };
  }, [showScanModal, scanMode]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gray-900/50 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🚗 OEM Subaru Wheel Inventory
              </h1>
              <p className="text-gray-400 mt-1 text-sm">Vision UI Dashboard - Professional Inventory Management v2.2.1</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowScanModal(true)}
                className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold text-white shadow-lg shadow-green-500/50 hover:shadow-green-500/75 transition-all duration-300 hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scan Barcode
                </span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-600 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur"></div>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/50 hover:shadow-blue-500/75 transition-all duration-300 hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Wheel
                </span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur"></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 backdrop-blur-xl p-4 rounded-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300 transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-gray-800/80 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-2">Available Inventory</p>
                  <p className="text-4xl font-bold text-white mb-1">{summary.availableCount || 0}</p>
                  <p className="text-green-400 text-lg font-semibold">${(summary.availableValue || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-green-500/50">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-gray-800/80 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-2">Sold Items</p>
                  <p className="text-4xl font-bold text-white mb-1">{summary.soldCount || 0}</p>
                  <p className="text-blue-400 text-lg font-semibold">${(summary.soldValue || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg shadow-blue-500/50">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Tabs */}
        <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('available')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === 'available'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Available ({summary.availableCount || 0})
              </button>
              <button
                onClick={() => setActiveTab('sold')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === 'sold'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Sold ({summary.soldCount || 0})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-300">Filter by Model:</label>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
              >
                <option value="">All Models</option>
                {uniqueModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              {modelFilter && (
                <button
                  onClick={() => setModelFilter('')}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Clear filter"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        )}

        {!loading && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      UPC-A SKU
                      <div className="text-xs text-gray-500 normal-case mt-1">(Click for barcode)</div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Part #</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Offset</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Finish</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredWheels.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-gray-400">
                          {modelFilter ? `No ${activeTab} wheels found for ${modelFilter}` : `No ${activeTab} wheels found`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredWheels.map((wheel, index) => (
                      <tr 
                        key={wheel.id} 
                        className="hover:bg-white/5 transition-colors duration-200"
                        style={{animationDelay: `${index * 50}ms`}}
                      >
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-blue-400 hover:text-blue-300 cursor-pointer hover:underline"
                          onClick={() => handleSKUClick(wheel)}
                          title="Click to view barcode"
                        >
                          {wheel.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{wheel.part_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{wheel.size}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{wheel.offset || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{wheel.model}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{wheel.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{wheel.finish || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            wheel.grade === 'A' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            wheel.grade === 'B' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            Grade {wheel.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">${parseFloat(wheel.retail_price).toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePrintLabel(wheel.id)}
                              className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 border border-purple-500/30 transition-all duration-200"
                              title="Print Label"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </button>
                            {wheel.status === 'sold' && (
                              <button
                                onClick={() => handlePrintInvoice(wheel.id)}
                                className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 border border-blue-500/30 transition-all duration-200"
                                title="Print Invoice"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusToggle(wheel.id, wheel.status)}
                              className={`p-2 rounded-lg border transition-all duration-200 ${
                                wheel.status === 'available'
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30'
                                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30'
                              }`}
                              title={wheel.status === 'available' ? 'Mark as Sold' : 'Mark as Available'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(wheel.id)}
                              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 border border-red-500/30 transition-all duration-200"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Barcode Scanner Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Scan Barcode</h2>
                <button
                  onClick={() => {
                    setShowScanModal(false);
                    stopCameraScanner();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scan Mode Selector */}
              <div className="mb-6 flex gap-3">
                <button
                  onClick={() => {
                    setScanMode('usb');
                    stopCameraScanner();
                  }}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    scanMode === 'usb'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    USB Scanner
                  </div>
                </button>
                <button
                  onClick={() => setScanMode('camera')}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    scanMode === 'camera'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Camera Scanner
                  </div>
                </button>
              </div>

              {/* USB Scanner Mode */}
              {scanMode === 'usb' && (
                <div className="bg-gray-700/30 border border-white/10 rounded-xl p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <h3 className="text-xl font-bold text-white mb-2">Ready to Scan</h3>
                  <p className="text-gray-400 mb-4">
                    Use your USB barcode scanner to scan a UPC-A barcode
                  </p>
                  {scanBuffer && (
                    <div className="text-blue-400 font-mono text-sm mb-2">
                      Scanning: {scanBuffer}
                    </div>
                  )}
                  <div className="inline-flex items-center gap-2 text-sm text-gray-400 bg-gray-800/50 px-4 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Listening for scanner input...
                  </div>
                </div>
              )}

              {/* Camera Scanner Mode */}
              {scanMode === 'camera' && (
                <div className="bg-gray-700/30 border border-white/10 rounded-xl p-4">
                  <div 
                    ref={videoRef}
                    id="barcode-scanner"
                    className="relative bg-black rounded-lg overflow-hidden"
                    style={{height: '400px'}}
                  >
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
                        <div className="text-center">
                          <svg className="w-16 h-16 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-white">Starting Camera...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {scanStatus && (
                    <div className="text-center mt-4">
                      <p className="text-blue-400 font-semibold">{scanStatus}</p>
                    </div>
                  )}
                  <p className="text-center text-gray-400 text-sm mt-4">
                    Position barcode in the center of the camera view
                  </p>
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300">
                      <strong>iPhone Tip:</strong> Make sure camera permission is enabled in Settings → Safari → Camera
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowScanModal(false);
                    stopCameraScanner();
                  }}
                  className="px-6 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-gray-300 hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Display Modal */}
      {showBarcodeModal && selectedWheel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Barcode Label</h2>
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div id="barcode-label" className="border-2 border-white/10 rounded-xl p-8 bg-white text-center">
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

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="px-6 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-gray-300 hover:bg-gray-700 font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveBarcodeLabel}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-medium shadow-lg shadow-green-500/50 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Save as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Wheel Modal - Same as before */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Add New Wheel</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Part Number *</label>
                    <input
                      type="text"
                      name="part_number"
                      value={formData.part_number}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
                      placeholder="68811"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Size *</label>
                    <input
                      type="text"
                      name="size"
                      value={formData.size}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
                      placeholder="17x7.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Offset</label>
                    <input
                      type="text"
                      name="offset"
                      value={formData.offset}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
                      placeholder="55 (+ will be added automatically)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Model *</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
                      placeholder="Crosstrek"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Year *</label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
                      placeholder="2018"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Finish</label>
                    <input
                      type="text"
                      name="finish"
                      value={formData.finish}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
                      placeholder="Silver"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Grade *</label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
                    >
                      <option value="">Select Grade</option>
                      <option value="A">A - Excellent</option>
                      <option value="B">B - Good</option>
                      <option value="C">C - Fair</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Retail Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="retail_price"
                      value={formData.retail_price}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-xl"
                      placeholder="150.00"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-gray-300 hover:bg-gray-700 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 font-medium shadow-lg shadow-blue-500/50 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Wheel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900/50 backdrop-blur-xl border-t border-white/10 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© 2025 Wheel Inventory System v2.2.1 - Vision UI Design + Barcode Scanning (Quagga.js)</p>
            <div className="flex gap-6">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Barcode Scanner
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Redis Caching
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                PDF Labels
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
