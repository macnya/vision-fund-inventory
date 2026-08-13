import { useState, useEffect } from 'react';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import CreateEmployee from './pages/CreateEmployee';
import CreateLocation from './pages/CreateLocation';
import UserManagement from './pages/UserManagement';
import CreateUser from './pages/CreateUser';
import CreateAsset from './pages/CreateAsset';
import VerificationReport from './pages/VerificationReport';
import AssetLocations from './pages/AssetLocation';
import ChangePassword from './pages/ChangePassword';
import { refreshSession } from './api';
import { isAdmin, canCreateAssets, canManageRecords } from './roles';
import logo from './assets/logo.png';

const TABS = [
  { key: 'dashboard',     label: 'Dashboard' },
  { key: 'list',          label: 'Assets' },
  { key: 'locations',     label: 'Locations' },
  { key: 'verifications', label: 'Verifications' },
  { key: 'users',         label: 'Staff accounts', adminOnly: true },
];

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [selectedAssetCode, setSelectedAssetCode] = useState(null);
  const [listInitialStatus, setListInitialStatus] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(JSON.parse(stored));

    // The cached copy can be stale — a role change or a forced password reset
    // happens in the database, not in this browser. Refreshing on load also
    // trades the stored token for a fresh 8h one, so a session started in the
    // morning doesn't expire mid-afternoon.
    refreshSession()
      .then((freshUser) => setUser(freshUser))
      .catch(() => {
        // Offline, or the token has already expired — the 401 interceptor in
        // api.js handles that case by clearing storage and reloading.
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) return <Login onLoginSuccess={setUser} />;

  // A temporary password stands between them and the app until it's replaced.
  // The backend doesn't refuse other endpoints on this flag — it's a prompt,
  // not a lock — but there's no route past this screen in the UI.
  if (user.must_change_password) {
    return <ChangePassword user={user} forced onDone={setUser} />;
  }

  if (changingPassword) {
    return (
      <ChangePassword
        user={user}
        onDone={(u) => { setUser(u); setChangingPassword(false); }}
        onCancel={() => setChangingPassword(false)}
      />
    );
  }

  const openAsset = (code) => { setSelectedAssetCode(code); setView('detail'); };

  let content;
  if (view === 'detail') {
    content = <AssetDetail assetCode={selectedAssetCode} onBack={() => setView('list')} />;

  } else if (view === 'newEmployee') {
    content = (
      <CreateEmployee onBack={() => setView('list')}
        onCreated={() => { alert('Employee created'); setView('list'); }} />
    );

  } else if (view === 'newLocation') {
    content = (
      <CreateLocation onBack={() => setView('list')}
        onCreated={() => { alert('Location created'); setView('list'); }} />
    );

  } else if (view === 'users') {
    content = isAdmin(user)
      ? <UserManagement currentUserId={user.id} onCreateNew={() => setView('newUser')} />
      : <AccessDenied />;

  } else if (view === 'newUser') {
    content = isAdmin(user)
      ? <CreateUser onBack={() => setView('users')}
          onCreated={() => { alert('IT staff account created'); setView('users'); }} />
      : <AccessDenied />;

  } else if (view === 'newAsset') {
    content = (
      <CreateAsset
        onBack={() => setView('list')}
        onCreated={(code) => {
          alert('Asset created. You can now find it in the list and print its barcode.');
          openAsset(code);
        }}
      />
    );

  } else if (view === 'verifications') {
    content = <VerificationReport />;

  } else if (view === 'locations') {
    content = <AssetLocations onSelectAsset={openAsset} />;

  } else if (view === 'list') {
    content = (
      <AssetList
        onSelectAsset={openAsset}
        initialStatus={listInitialStatus}
        canCreate={canCreateAssets(user)}
        canManage={canManageRecords(user)}
        onNewAsset={() => setView('newAsset')}
        onNewEmployee={() => setView('newEmployee')}
        onNewLocation={() => setView('newLocation')}
      />
    );

  } else {
    content = (
      <Dashboard
        onNavigate={(targetView, status) => {
          setListInitialStatus(status || '');
          setView(targetView);
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img src={logo} alt="Vision Fund Kenya" />
          </div>

          <nav className="nav">
            {TABS.filter((t) => !t.adminOnly || isAdmin(user)).map((t) => (
              <button
                key={t.key}
                className={view === t.key ? 'nav-item is-active' : 'nav-item'}
                onClick={() => setView(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="topbar-user">
            {user.branch && <span className="badge badge-navy">{user.branch}</span>}

            {/* Plain text, not a button. Clicking your own name and landing on
                a password form is a surprise; the action gets its own control. */}
            <span className="topbar-name" title={`${user.email} · ${user.role}`}>
              {user.name}
            </span>

            <button className="btn btn-ghost btn-sm" onClick={() => setChangingPassword(true)}>
              Change password
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>

      {content}
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-body">
          <h2>Not available for your role</h2>
          <p className="page-sub">Ask an IT Admin if you need access to this section.</p>
        </div>
      </div>
    </div>
  );
}

export default App;