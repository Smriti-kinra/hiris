import { useState, useEffect } from 'react'
import { apiFetch } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import AppShell from '../../../components/AppShell'

function emptyPermissions(permissionGroups) {
  return Object.fromEntries(
    permissionGroups.flatMap(group => group.permissions.map(permission => [permission.key, false]))
  )
}

/* ── Shared modal shell ── */
function Modal({ children, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        {children}
      </div>
    </div>
  )
}

/* ── Create Role Modal ── */
function CreateRoleModal({ templates, permissionGroups, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [templateKey, setTemplateKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  async function handleCreate() {
    const template = templates.find(t => t.key === templateKey)
    const roleName = name.trim() || template?.name || ''
    if (!roleName) return setErr('Role name is required.')
    if (roleName.length > 50) return setErr('Role name must be 50 characters or fewer.')
    setBusy(true); setErr('')
    try {
      const res  = await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: roleName,
          description: template?.description || null,
          permissions: template?.permissions || emptyPermissions(permissionGroups),
          visible_stages: template?.visible_stages || [],
          permission_groups: template?.permission_groups || [],
          landing_portal: template?.landing_portal || 'hiring',
          home_path: template?.home_path || null,
          template_key: template ? `${template.key}-copy` : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create role')
      onSuccess(data)
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 13.5, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }

  return (
    <Modal onClose={onClose}>
      <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="card-title">Create Custom Role</div>
          <div className="card-sub">Add a new role to your organisation</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Start From Template
          </label>
          <select
            style={inputStyle}
            value={templateKey}
            onChange={e => {
              const key = e.target.value
              setTemplateKey(key)
              const template = templates.find(t => t.key === key)
              if (template && !name.trim()) setName(`${template.name} Copy`)
            }}
          >
            <option value="">Blank custom role</option>
            {templates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Role Name *
          </label>
          <input
            style={inputStyle}
            placeholder="e.g. Intern, Coordinator, Partner"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            maxLength={50}
            autoFocus
          />
        </div>
        {err && (
          <div style={{ background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{err}</div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
            {busy ? 'Creating…' : 'Create Role'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Delete Confirm Modal ── */
function DeleteModal({ role, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  async function handleDelete() {
    setBusy(true); setErr('')
    try {
      const res  = await apiFetch(`/roles/${role.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete role')
      onSuccess(role.id)
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal onClose={onClose}>
      <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-red)', color: '#fff', fontSize: 14 }}>!</span>
            Delete Role
          </div>
          <div className="card-sub">This action cannot be undone</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--bg-active)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, color: 'var(--text-primary)' }}>
          Are you sure you want to delete <strong>"{role.name}"</strong>? Users assigned this role may lose access.
        </div>
        {err && (
          <div style={{ background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{err}</div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn"
            style={{ background: 'var(--accent-red)', color: '#fff', opacity: busy ? 0.7 : 1 }}
            onClick={handleDelete}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete Role'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Main Component ── */
export default function RoleManagement() {
  const { user }  = useAuth()
  const toast     = useToast()
  const [config, setConfig]             = useState({ permission_groups: [], pipeline_stages: [], role_templates: [] })
  const [roles, setRoles]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [savingId, setSavingId]         = useState(null)

  useEffect(() => {
    Promise.all([
      apiFetch('/roles/config').then(r => r.json()),
      fetchRoles(),
    ]).then(([cfg]) => {
      setConfig({
        permission_groups: cfg.permission_groups || [],
        pipeline_stages: cfg.pipeline_stages || [],
        role_templates: cfg.role_templates || [],
      })
    })
  }, [])

  async function fetchRoles() {
    setLoading(true)
    try {
      const res = await apiFetch('/roles')
      if (!res.ok) throw new Error('Failed to fetch roles')
      setRoles(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function togglePermission(roleId, permKey) {
    const roleIndex = roles.findIndex(r => r.id === roleId)
    if (roleIndex === -1) return

    const role = roles[roleIndex]
    const updatedPerms = { ...role.permissions, [permKey]: !role.permissions[permKey] }

    setRoles(prev => {
      const next = [...prev]
      next[roleIndex] = { ...role, permissions: updatedPerms }
      return next
    })
    setSavingId(roleId)

    try {
      const res = await apiFetch(`/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: updatedPerms }),
      })
      if (!res.ok) {
        setRoles(prev => { const next = [...prev]; next[roleIndex] = role; return next })
        throw new Error('Failed to update permission')
      }
      toast.success('Permission updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingId(null)
    }
  }

  async function toggleStage(roleId, stageKey) {
    const roleIndex = roles.findIndex(r => r.id === roleId)
    if (roleIndex === -1) return

    const role = roles[roleIndex]
    const stages = role.visible_stages || []
    const updatedStages = stages.includes(stageKey)
      ? stages.filter(s => s !== stageKey)
      : [...stages, stageKey]

    setRoles(prev => {
      const next = [...prev]
      next[roleIndex] = { ...role, visible_stages: updatedStages }
      return next
    })
    setSavingId(roleId)

    try {
      const res = await apiFetch(`/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify({ visible_stages: updatedStages }),
      })
      if (!res.ok) {
        setRoles(prev => { const next = [...prev]; next[roleIndex] = role; return next })
        throw new Error('Failed to update visible stages')
      }
      toast.success('Stage visibility updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingId(null)
    }
  }

  function handleCreated(newRole) {
    setRoles(prev => [...prev, newRole])
    setShowCreate(false)
    toast.success(`Role "${newRole.name}" created`)
  }

  function handleDeleted(id) {
    const name = roles.find(r => r.id === id)?.name
    setRoles(prev => prev.filter(r => r.id !== id))
    setDeleteTarget(null)
    toast.success(`Role "${name}" deleted`)
  }

  if (loading) {
    return (
      <AppShell portal="chro" pageTitle="Role Management">
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div className="spinner" />
        </div>
      </AppShell>
    )
  }

  if (!user?.permissions?.can_manage_roles && !user?.permissions?.is_admin) {
    return (
      <AppShell portal="chro" pageTitle="Role Management">
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="page-title" style={{ marginBottom: 12 }}>Access Denied</div>
          <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view or manage organisational roles.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell portal="chro" pageTitle="Role Management">
      <div className="page-header">
        <div>
          <div className="page-title">Role Management</div>
          <div className="page-subtitle">Define dynamic roles and permissions for your organisation.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Create Custom Role
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13.5 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 20 }}>
        {roles.map(role => (
          <div key={role.id} className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{role.name}</h3>
                {savingId === role.id && <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              </div>
              {role.is_system ? (
                <span className="badge badge-gray">Role Template</span>
              ) : (
                <button
                  onClick={() => setDeleteTarget(role)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--accent-red)', padding: '4px 10px', borderRadius: 6 }}
                >
                  Delete Role
                </button>
              )}
            </div>

            {role.description && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{role.description}</div>
            )}

            <div style={{ display: 'grid', gap: 16 }}>
              {config.permission_groups.map(group => (
                <div key={group.key}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {group.permissions.map(pk => {
                      const hasPerm = !!role.permissions?.[pk.key]
                      return (
                        <label key={pk.key} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                          fontSize: 12.5, fontWeight: 600,
                          border: `1.5px solid ${hasPerm ? 'var(--accent-green)' : 'var(--border-strong)'}`,
                          background: hasPerm ? 'var(--badge-green-bg)' : 'var(--bg-active)',
                          color: hasPerm ? 'var(--badge-green-text)' : 'var(--text-secondary)',
                          transition: 'all 0.15s',
                          userSelect: 'none',
                        }}>
                          <input
                            type="checkbox"
                            checked={hasPerm}
                            onChange={() => togglePermission(role.id, pk.key)}
                            style={{ accentColor: 'var(--accent-green)', width: 13, height: 13 }}
                          />
                          {pk.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Visible Candidate Stages
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {config.pipeline_stages.map(stage => {
                    const visible = role.visible_stages?.includes(stage.key)
                    return (
                      <label key={stage.key} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                        fontSize: 12.5, fontWeight: 600,
                        border: `1.5px solid ${visible ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                        background: visible ? 'var(--badge-blue-bg)' : 'var(--bg-active)',
                        color: visible ? 'var(--badge-blue-text)' : 'var(--text-secondary)',
                      }}>
                        <input
                          type="checkbox"
                          checked={!!visible}
                          onChange={() => toggleStage(role.id, stage.key)}
                          style={{ accentColor: 'var(--accent-blue)', width: 13, height: 13 }}
                        />
                        {stage.label}
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateRoleModal
          templates={config.role_templates}
          permissionGroups={config.permission_groups}
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreated}
        />
      )}
      {deleteTarget && (
        <DeleteModal role={deleteTarget} onClose={() => setDeleteTarget(null)} onSuccess={handleDeleted} />
      )}
    </AppShell>
  )
}
