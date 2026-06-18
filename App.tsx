/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { GlobalUI } from './components/GlobalUI';

import { Dashboard } from './pages/Dashboard';
import { DataCenter } from './pages/DataCenter';
import { AdvanceList } from './pages/AdvanceList';
import { CreateAdvance } from './pages/CreateAdvance';
import { ApprovalCenter } from './pages/ApprovalCenter';
import { PaymentCenter } from './pages/PaymentCenter';
import { ClearanceCenter } from './pages/ClearanceCenter';
import { AccountingReview } from './pages/AccountingReview';
import { AdvanceDetail } from './pages/AdvanceDetail';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { DocumentVault } from './pages/DocumentVault';

const AppContent = () => {
  const { page } = useApp();

  return (
    <div className="layout" id="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="pb" id="pc">
          {page === 'dashboard' && <Dashboard />}
          {page === 'datacenter' && <DataCenter />}
          {page === 'list' && <AdvanceList />}
          {page === 'create' && <CreateAdvance />}
          {page === 'approval' && <ApprovalCenter />}
          {page === 'payment' && <PaymentCenter />}
          {page === 'clearance' && <ClearanceCenter />}
          {page === 'accounting' && <AccountingReview />}
          {page === 'detail' && <AdvanceDetail />}
          {page === 'vault' && <DocumentVault />}
          {page === 'reports' && <Reports />}
          {page === 'settings' && <Settings />}
        </div>
      </div>
      <GlobalUI />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

