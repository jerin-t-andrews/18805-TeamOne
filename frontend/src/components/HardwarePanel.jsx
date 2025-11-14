import { useEffect, useState } from 'react';

const BASE_URL = 'http://127.0.0.1:5000';

function HardwarePanel({ selectedProjectId, username }) {
  const [hardware, setHardware] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchHardware = async () => {
    try {
      setLoading(true);
      setMessage('');
      const qs = selectedProjectId ? `?project_id=${encodeURIComponent(selectedProjectId)}` : '';
      const res = await fetch(`/hardware${qs}`);
      const data = await res.json();
      setHardware(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setMessage('Failed to load hardware sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHardware();
    // also refetch whenever project changes to reflect per-project availability
  }, [selectedProjectId]);

  const updateAmount = (name, value) => {
    setAmounts((prev) => ({ ...prev, [name]: value }));
  };

  const doAction = async (name, kind) => {
    if (!selectedProjectId) {
      setMessage('Select a project first');
      return;
    }
    if (!username) {
      setMessage('You must be logged in');
      return;
    }
    const raw = amounts[name];
    const amt = parseInt(raw, 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage('Enter a positive amount');
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch(`/hardware/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount: amt, project_id: selectedProjectId, username })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || `${kind} successful`);
        await fetchHardware();
      } else {
        setMessage(data.message || `${kind} failed`);
      }
    } catch (e) {
      console.error(e);
      // setMessage('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h3>Hardware Sets {selectedProjectId ? `(Project: ${selectedProjectId})` : ''}</h3>
      {!selectedProjectId && (
        <div className="warning">Select a project to check in/out hardware.</div>
      )}
      {loading && hardware.length === 0 ? (
        <div>Loading...</div>
      ) : (
        <div className="hardware-list">
          {hardware.map((h) => (
            <div key={h.name} className="hardware-item">
              <div className="hardware-header">
                <strong>{h.name}</strong>
                <span>Available: {h.available} / {h.capacity}</span>
              </div>
              <div className="hardware-actions">
                <input
                  type="number"
                  min="1"
                  placeholder="Amount"
                  value={amounts[h.name] ?? ''}
                  onChange={(e) => updateAmount(h.name, e.target.value)}
                />
                <button disabled={loading || !selectedProjectId} onClick={() => doAction(h.name, 'checkout')}>Check Out</button>
                <button disabled={loading || !selectedProjectId} onClick={() => doAction(h.name, 'checkin')}>Check In</button>
              </div>
            </div>
          ))}
          {hardware.length === 0 && <div>No hardware sets found.</div>}
        </div>
      )}
      {message && <div className="message">{message}</div>}
    </section>
  );
}

export default HardwarePanel;
