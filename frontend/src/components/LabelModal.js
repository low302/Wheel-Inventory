import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';

function LabelModal({ wheel, onClose }) {
  const labelRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!labelRef.current) return;

    try {
      const canvas = await html2canvas(labelRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `label-${wheel.sku}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error saving label:', error);
      alert('Failed to save label');
    }
  };

  const handleCopy = async () => {
    if (!labelRef.current) return;

    try {
      const canvas = await html2canvas(labelRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Label copied to clipboard!');
        } catch (error) {
          console.error('Error copying to clipboard:', error);
          alert('Failed to copy label to clipboard');
        }
      });
    } catch (error) {
      console.error('Error copying label:', error);
      alert('Failed to copy label');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Wheel Label</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div ref={labelRef} className="label-preview">
            <div className="label-sku">
              {wheel.sku}
            </div>
            <div className="label-details">
              {wheel.year} {wheel.make} {wheel.model}<br />
              {wheel.wheel_size} | {wheel.bolt_pattern}<br />
              {wheel.offset && `Offset: ${wheel.offset} | `}
              {wheel.condition}
              {wheel.location && (
                <>
                  <br />
                  Loc: {wheel.location}
                </>
              )}
            </div>
            <div className="label-qr">
              <QRCode
                value={wheel.sku}
                size={100}
                level="H"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print
            </button>
            <button className="btn btn-secondary" onClick={handleSave}>
              💾 Save
            </button>
            <button className="btn btn-secondary" onClick={handleCopy}>
              📋 Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LabelModal;
