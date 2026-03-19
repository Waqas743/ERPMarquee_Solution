import React, { useEffect, useState } from 'react';
import { Save, Shield, Globe, Mail, Bell, Database } from 'lucide-react';
import { getCurrentUser, getTenantId } from '../utils/session';
import { SearchableSelect } from '../components/SearchableSelect';

const Settings = () => {
  const user = getCurrentUser();
  const tenantId = getTenantId();
  const isSuperAdmin = user.role === 'super_admin';

  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(isSuperAdmin ? '' : String(tenantId));
  const [settings, setSettings] = useState({
    systemName: '',
    supportEmail: '',
    defaultCurrency: 'PKR',
    maintenanceMode: 'false',
    allowPublicRegistration: 'true',
    emailNotifications: 'true',
    smsNotifications: 'false',
    newTenantAlerts: 'true',
    subscriptionExpiryAlerts: 'true',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchSettings = (tenantId: string) => {
    if (!tenantId) return;
    setLoading(true);
    fetch(`/api/settings?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/tenants')
        .then(res => res.json())
        .then(data => {
          setTenants(data);
          if (data.length > 0) {
            setSelectedTenantId(String(data[0].id));
            fetchSettings(String(data[0].id));
          } else {
            setLoading(false);
          }
        });
    } else {
      fetchSettings(String(tenantId));
    }
  }, []);

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    fetchSettings(tenantId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, tenantId: selectedTenantId }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings updated successfully!' });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm sm:text-base text-slate-500">Configure parameters for the Marquee ERP platform.</p>
        </div>
        {isSuperAdmin && (
          <div className="w-full sm:w-64 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Select Tenant</label>
            <SearchableSelect
              options={tenants.map((t: any) => ({ value: t.id, label: t.name }))}
              value={selectedTenantId}
              onChange={(value) => handleTenantChange(value)}
              placeholder="Select Tenant"
              className="w-full"
            />
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl border ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <Globe className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-900">General Configuration</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">System Name</label>
                <input
                  type="text"
                  value={settings.systemName}
                  onChange={e => setSettings({ ...settings, systemName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Default Currency</label>
                <SearchableSelect
                  options={[
                    { value: 'PKR', label: 'Pakistani Rupee (PKR)' },
                    { value: 'USD', label: 'US Dollar (USD)' },
                    { value: 'GBP', label: 'British Pound (GBP)' },
                    { value: 'AED', label: 'UAE Dirham (AED)' }
                  ]}
                  value={settings.defaultCurrency}
                  onChange={(value) => setSettings({ ...settings, defaultCurrency: value })}
                  placeholder="Select Currency"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <Mail className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-900">Communication</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Support Email Address</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-xs text-slate-500">This email will be shown to tenants for support requests.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <Shield className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-900">Security & Access</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">Maintenance Mode</span>
                <span className="text-xs text-slate-500">Disable access for all non-admin users.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode === 'true'}
                  onChange={e => setSettings({ ...settings, maintenanceMode: String(e.target.checked) })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">Public Registration</span>
                <span className="text-xs text-slate-500">Allow new tenants to sign up from the landing page.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowPublicRegistration === 'true'}
                  onChange={e => setSettings({ ...settings, allowPublicRegistration: String(e.target.checked) })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <Bell className="text-indigo-600" size={20} />
            <h3 className="font-bold text-slate-900">Notifications</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">Email Notifications</span>
                <span className="text-xs text-slate-500">Enable global email delivery for the system.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications === 'true'}
                  onChange={e => setSettings({ ...settings, emailNotifications: String(e.target.checked) })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">SMS Notifications</span>
                <span className="text-xs text-slate-500">Enable SMS alerts via integrated gateway.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications === 'true'}
                  onChange={e => setSettings({ ...settings, smsNotifications: String(e.target.checked) })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Admin Alerts</h4>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.newTenantAlerts === 'true'}
                    onChange={e => setSettings({ ...settings, newTenantAlerts: String(e.target.checked) })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">New tenant registration alerts</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.subscriptionExpiryAlerts === 'true'}
                    onChange={e => setSettings({ ...settings, subscriptionExpiryAlerts: String(e.target.checked) })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Subscription expiry warnings</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
