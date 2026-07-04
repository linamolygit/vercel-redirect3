import React, { useState, useEffect } from "react";

export interface LinkData {
  id: number;
  short_id: string;
  original_url: string;
  [key: string]: any;
}

interface EditLinkModalProps {
  isOpen: boolean;
  link: LinkData | null;
  onClose: () => void;
  onSuccess: (updatedLink: any) => void;
}

const EditLinkModal: React.FC<EditLinkModalProps> = ({ isOpen, link, onClose, onSuccess }) => {
  const [shortId, setShortId] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && link) {
      setShortId(link.short_id);
      setOriginalUrl(link.original_url);
      setError("");
    }
  }, [isOpen, link]);

  if (!isOpen || !link) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortId.trim() || !originalUrl.trim()) {
      setError("Both fields are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/edit-link", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: link.id,
          short_id: shortId.trim(),
          original_url: originalUrl.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update link");
      }

      // Success
      onSuccess({
        ...link,
        short_id: data.short_id,
        original_url: data.original_url,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while updating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <div className="modal-header">
          <h2>Edit Redirect Link</h2>
          <button className="btn-close" onClick={onClose}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-msg">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="control-row">
            <label>Custom Alias (Short ID)</label>
            <div className="input-group">
              <span className="domain-prefix">linkpika.com/</span>
              <input
                type="text"
                value={shortId}
                onChange={(e) => setShortId(e.target.value)}
                placeholder="my-custom-link"
                required
                pattern="[a-zA-Z0-9-]+"
                title="Only letters, numbers, and hyphens are allowed"
              />
            </div>
            <p className="field-hint">Use a descriptive alias for your campaign.</p>
          </div>

          <div className="control-row">
            <label>Destination URL</label>
            <input
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="https://example.com/target"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 5, 25, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          width: 100%;
          max-width: 500px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: var(--text-main);
        }

        .btn-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-close:hover {
          color: var(--text-main);
          background: rgba(255,255,255,0.05);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 12px;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .input-group {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--input-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--input-bg);
          transition: border-color 0.2s;
        }

        .input-group:focus-within {
          border-color: var(--primary);
        }

        .domain-prefix {
          background: rgba(255, 255, 255, 0.03);
          padding: 0 14px;
          display: flex;
          align-items: center;
          color: var(--text-muted);
          border-right: 1px solid var(--input-border);
          font-size: 0.95rem;
          user-select: none;
        }

        .input-group input {
          border: none;
          border-radius: 0;
          flex: 1;
        }

        .field-hint {
          margin: 6px 0 0;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default EditLinkModal;
