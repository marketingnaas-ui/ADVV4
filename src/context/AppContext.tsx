import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Advance } from '../types';
import { INITIAL_ADV, SETTINGS_DEFAULT } from '../lib/data';

interface AppState {
  advances: Advance[];
  settings: Record<string, boolean>;
  page: string;
  setPage: (p: string, extra?: any) => void;
  pageExtra: any;
  updateSettings: (k: string, v: boolean) => void;
  addAdvance: (a: Advance) => void;
  updateAdvance: (id: string, partial: Partial<Advance>) => void;
  toast: (msg: string, type?: string) => void;
  toastState: { msg: string; type: string; show: boolean };
  modal: { title: string; desc: ReactNode; actions: ReactNode; show: boolean };
  openModal: (title: string, desc: ReactNode, actions: ReactNode) => void;
  closeModal: () => void;
  drawer: { hdr: ReactNode; body: ReactNode; foot: ReactNode; show: boolean };
  openDrawer: (hdr: ReactNode, body: ReactNode, foot?: ReactNode) => void;
  closeDrawer: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [advances, setAdvances] = useState<Advance[]>(() => {
    try {
      const saved = localStorage.getItem('clear_advance_v2_adv');
      return saved ? JSON.parse(saved) : INITIAL_ADV;
    } catch {
      return INITIAL_ADV;
    }
  });
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('clear_advance_v2_settings');
      return saved ? JSON.parse(saved) : SETTINGS_DEFAULT;
    } catch {
      return SETTINGS_DEFAULT;
    }
  });

  React.useEffect(() => {
    localStorage.setItem('clear_advance_v2_adv', JSON.stringify(advances));
  }, [advances]);

  React.useEffect(() => {
    localStorage.setItem('clear_advance_v2_settings', JSON.stringify(settings));
  }, [settings]);

  const [page, setPageInternal] = useState('dashboard');
  const [pageExtra, setPageExtra] = useState<any>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [toastState, setToastState] = useState({ msg: '', type: '', show: false });
  const [modal, setModal] = useState({ title: '', desc: null as ReactNode, actions: null as ReactNode, show: false });
  const [drawer, setDrawer] = useState({ hdr: null as ReactNode, body: null as ReactNode, foot: null as ReactNode, show: false });

  const toast = (msg: string, type = '') => {
    setToastState({ msg, type, show: true });
    setTimeout(() => setToastState(s => ({ ...s, show: false })), 2600);
  };

  const setPage = (p: string, extra?: any) => {
    setPageInternal(p);
    setPageExtra(extra || {});
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <AppContext.Provider value={{
      advances, settings, page, setPage, pageExtra,
      updateSettings: (k, v) => setSettings(s => ({ ...s, [k]: v })),
      addAdvance: (a) => setAdvances(prev => [...prev, a]),
      updateAdvance: (id, partial) => setAdvances(prev => prev.map(a => a.id === id ? { ...a, ...partial } : a)),
      toast, toastState,
      modal, openModal: (title, desc, actions) => setModal({ title, desc, actions, show: true }), closeModal: () => setModal(m => ({ ...m, show: false })),
      drawer, openDrawer: (hdr, body, foot) => setDrawer({ hdr, body, foot, show: true }), closeDrawer: () => setDrawer(d => ({ ...d, show: false })),
      sidebarOpen, setSidebarOpen
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext)!;
