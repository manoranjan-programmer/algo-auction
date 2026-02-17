import { useState, useEffect, useRef } from 'react';
import './index.css';
import { tiers, datasets } from './data';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [page, setPage] = useState('login'); // login, signup, team, bids, datasets, credits, results
  const [token, setToken] = useState(localStorage.getItem('cld_token') || null);
  const [user, setUser] = useState(null); // Optional: decode token if needed, or just track auth status
  const [teamName, setTeamName] = useState('');
  const [selectedBids, setSelectedBids] = useState([]);
  const [selectedData, setSelectedData] = useState([]);
  const [credits, setCredits] = useState('');
  const [score, setScore] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');

  // Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Refs for Google Buttons
  const loginBtnRef = useRef(null);
  const signupBtnRef = useRef(null);
  const googleScriptLoaded = useRef(false);

  useEffect(() => {
    // Check auth on load
    if (token) {
      setPage('team');
    }

    // Fetch config
    fetch(`${API_URL}/config`)
      .then(r => r.json())
      .then(data => {
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(err => console.error('Config load error', err));
  }, [token]);

  // Initialize Google Auth when script is ready and ClientID is available
  useEffect(() => {
    if (googleClientId && window.google && !googleScriptLoaded.current) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse
      });
      googleScriptLoaded.current = true;
    }
  }, [googleClientId]);

  // Render Google Buttons whenever we are on login/signup pages
  useEffect(() => {
    if (googleScriptLoaded.current && window.google) {
      if (page === 'login' && loginBtnRef.current) {
        window.google.accounts.id.renderButton(
          loginBtnRef.current,
          { theme: 'outline', size: 'large', width: '100%' } // Customized width not natively supported by API in px but try
        );
        // Force width 100% via style if possible or accept default
      }
      if (page === 'signup' && signupBtnRef.current) {
        window.google.accounts.id.renderButton(
          signupBtnRef.current,
          { theme: 'outline', size: 'large', width: '100%' }
        );
      }
    }
  }, [page, googleClientId]);

  const handleCredentialResponse = (response) => {
    fetch(`${API_URL}/google-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential })
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.token) {
          localStorage.setItem('cld_token', data.token);
          setToken(data.token);
          setPage('team');
        } else {
          alert('Google Sign-In failed on server.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Google Sign-In error.');
      });
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) return alert('Enter email and password');
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (data.ok && data.token) {
        localStorage.setItem('cld_token', data.token);
        setToken(data.token);
        setPage('team');
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (e) { console.error(e); alert('Connection error'); }
  };

  const handleSignup = async () => {
    if (!signupEmail || !signupPassword) return alert('Fill all fields');
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName, email: signupEmail, password: signupPassword })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Account created! Sign in.');
        setPage('login');
        setLoginEmail(signupEmail);
      } else {
        alert(data.error || 'Signup failed');
      }
    } catch (e) { console.error(e); alert('Connection error'); }
  };

  const logout = () => {
    localStorage.removeItem('cld_token');
    setToken(null);
    setPage('login');
    setSelectedBids([]);
    setSelectedData([]);
    setCredits('');
    setScore(null);
  };

  // Logic
  const toggleBid = (tierIndex, itemIndex) => {
    console.log(`Toggling Tier ${tierIndex} Item ${itemIndex}`);
    const id = `bid-${tierIndex}-${itemIndex}`;
    const exists = selectedBids.find(b => b.id === id);
    if (exists) {
      console.log('Removing:', id);
      setSelectedBids(selectedBids.filter(b => b.id !== id));
    } else {
      console.log('Adding:', id);
      setSelectedBids([...selectedBids, { id, tier: tierIndex, item: itemIndex }]);
    }
  };

  const toggleData = (d) => {
    if (selectedData.includes(d)) {
      setSelectedData(selectedData.filter(x => x !== d));
    } else {
      if (selectedData.length >= 5) {
        alert("You can only choose 5 datasets.");
        return;
      }
      setSelectedData([...selectedData, d]);
    }
  };

  const calculateAndSubmit = async () => {
    const credsVal = parseInt(credits) || 0;
    let total = 0;
    selectedBids.forEach(b => {
      const scores = tiers[b.tier].items[b.item].scores;
      selectedData.forEach(ds => {
        const dsIndex = datasets.indexOf(ds);
        if (dsIndex >= 0) total += scores[dsIndex];
      });
    });
    const finalScore = (credsVal / 100) + total;
    setScore(finalScore);
    setSaveStatus('Saving...');
    setPage('results'); // Show result page immediately

    try {
      const payload = {
        teamName: teamName || 'Unnamed',
        selectedBids,
        selectedData,
        credits: credsVal,
        score: finalScore
      };
      const res = await fetch(`${API_URL}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok) {
        setSaveStatus('Saved successfully');
      } else {
        setSaveStatus('Save failed');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('Error saving');
    }
  };

  // Render Pages
  return (
    <>
      {/* Login Page */}
      {page === 'login' && (
        <div className="page">
          <h2>Welcome Back</h2>
          <p className="subtitle">Sign in to continue to your dashboard</p>

          <div className="input-group">
            <input type="text" placeholder="Email address" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
          </div>

          <button className="btn btn-primary" onClick={handleLogin}>Sign In</button>

          <div className="divider"><span>or continue with</span></div>

          <div ref={loginBtnRef} style={{ width: '100%', marginBottom: 24, minHeight: 40 }}></div>

          <div className="text-center mt-4">
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Don't have an account? </span>
            <button className="btn btn-secondary w-auto" onClick={() => setPage('signup')} style={{ marginTop: 8, padding: '8px 16px' }}>Create account</button>
          </div>
        </div>
      )}

      {/* Signup Page */}
      {page === 'signup' && (
        <div className="page">
          <h2>Create Account</h2>
          <p className="subtitle">Join the simulation today</p>

          <div className="input-group">
            <input type="text" placeholder="Full name" value={signupName} onChange={e => setSignupName(e.target.value)} />
          </div>
          <div className="input-group">
            <input type="text" placeholder="Email address" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <input type="password" placeholder="Create password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
          </div>

          <button className="btn btn-primary" onClick={handleSignup}>Sign Up</button>

          <div className="divider"><span>or signup with</span></div>

          <div ref={signupBtnRef} style={{ width: '100%', marginBottom: 24, minHeight: 40 }}></div>

          <div className="text-center mt-4">
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Already have an account? </span>
            <button className="btn btn-secondary w-auto" onClick={() => setPage('login')} style={{ marginTop: 8, padding: '8px 16px' }}>Sign In</button>
          </div>
        </div>
      )}

      {/* Team Setup */}
      {page === 'team' && (
        <div className="page">
          <h2>Team Setup</h2>
          <p className="subtitle">Enter your team name to get started.</p>
          <div className="input-group">
            <input type="text" placeholder="e.g. The Avengers" value={teamName} onChange={e => setTeamName(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setPage('bids')}>Continue to Bids</button>
          <button className="btn btn-secondary mt-4" onClick={logout}>Logout</button>
        </div>
      )}

      {/* Bids Selection */}
      {page === 'bids' && (
        <div className="page wide">
          <div className="flex-between mb-6">
            <div>
              <h2>Select Bids</h2>
              <p className="subtitle" style={{ textAlign: 'left', marginBottom: 0 }}>Select at least 4 algorithms to proceed.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--text-muted)' }}>Selected: <strong style={{ color: 'white' }}>{selectedBids.length}</strong></span>
            </div>
          </div>

          <div id="bidGrids">
            {tiers.map((tier, ti) => (
              <div key={ti}>
                <h3>{tier.title}</h3>
                <div className="grid">
                  {tier.items.map((itm, ii) => (
                    <div
                      key={ii}
                      className={`select-btn ${selectedBids.some(b => b.tier === ti && b.item === ii) ? 'selected' : ''}`}
                      onClick={() => toggleBid(ti, ii)}
                    >
                      {itm.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex-between mt-4">
            <button className="btn btn-secondary w-auto px-8" onClick={() => setPage('team')}>Back</button>
            <button className="btn btn-primary w-auto px-8" onClick={() => {
              if (selectedBids.length < 4) return alert("Please select at least 4 algorithms.");
              setPage('datasets');
            }}>Next Step</button>
          </div>
        </div>
      )}

      {/* Dataset Selection */}
      {page === 'datasets' && (
        <div className="page wide">
          <div className="flex-between mb-6">
            <div>
              <h2>Select Datasets</h2>
              <p className="subtitle" style={{ textAlign: 'left', marginBottom: 0 }}>Choose exactly 5 datasets to test against.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--text-muted)' }}>Selected: <strong style={{ color: 'white' }}>{selectedData.length}</strong>/5</span>
            </div>
          </div>

          <div className="dataset-grid">
            {datasets.map(d => (
              <div
                key={d}
                className={`select-btn ${selectedData.includes(d) ? 'selected' : ''}`}
                onClick={() => toggleData(d)}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="flex-between mt-4">
            <button className="btn btn-secondary w-auto px-8" onClick={() => setPage('bids')}>Back</button>
            <button className="btn btn-primary w-auto px-8" onClick={() => {
              if (selectedData.length !== 5) return alert("Please select exactly 5 datasets.");
              setPage('credits');
            }}>Next Step</button>
          </div>
        </div>
      )}

      {/* Credits */}
      {page === 'credits' && (
        <div className="page">
          <h2>Final Details</h2>
          <p className="subtitle">Enter your remaining credits.</p>
          <div className="input-group">
            <input type="number" placeholder="Credits (0-100)" value={credits} onChange={e => setCredits(e.target.value)} />
          </div>
          <div className="flex-between gap-4">
            <button className="btn btn-secondary" onClick={() => setPage('datasets')}>Back</button>
            <button className="btn btn-primary" onClick={calculateAndSubmit}>Calculate Score</button>
          </div>
        </div>
      )}

      {/* Results */}
      {page === 'results' && (
        <div className="page">
          <h2>Simulation Complete</h2>
          <div id="result">
            Score: {score?.toFixed(2)}
            <br />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>{saveStatus}</span>
          </div>
          <button className="btn btn-secondary mt-4" onClick={() => window.location.reload()}>Start Over</button>
        </div>
      )}
    </>
  );
}

export default App;
