// Project structure (Vite + React + TS suggested)
// ├─ src/
// │  ├─ main.tsx
// │  ├─ App.tsx
// │  ├─ components/
// │  │  ├─ TopBar.tsx
// │  │  ├─ Card.tsx
// │  │  ├─ Capacities.tsx
// │  │  ├─ LoginForm.tsx
// │  │  ├─ CreateProjectForm.tsx
// │  │  └─ UseExistingProject.tsx
// │  └─ index.css  (Tailwind directives: @tailwind base; @tailwind components; @tailwind utilities;)
// └─ tailwind.config.ts (standard)

// ---------------- src/main.tsx ----------------
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// ---------------- src/App.tsx ----------------
import React from 'react'
import TopBar from './components/TopBar'
import Capacities from './components/Capacities'
import LoginForm from './components/LoginForm'
import CreateProjectForm from './components/CreateProjectForm'
import UseExistingProject from './components/UseExistingProject'
import Card from './components/Card'

export default function App() {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <TopBar />
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <Card title="Capacities">
            <Capacities />
          </Card>

          {/* Right column: stack of forms */}
          <div className="space-y-6">
            <Card title="Login">
              <LoginForm />
            </Card>
            <Card title="Create New Project">
              <CreateProjectForm />
            </Card>
            <Card title="Use Existing Project">
              <UseExistingProject />
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// ---------------- src/components/TopBar.tsx ----------------
import React from 'react'

export default function TopBar() {
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3 md:p-4">
        <div className="text-lg md:text-xl font-extrabold tracking-tight">Hardware Project Manager</div>
        <nav className="flex items-center gap-3 md:gap-4 text-sm">
          <button className="px-3 py-1.5 rounded-md hover:bg-stone-100">Login</button>
          <button className="px-3 py-1.5 rounded-md hover:bg-stone-100">Register</button>
        </nav>
      </div>
    </header>
  )
}

// ---------------- src/components/Card.tsx ----------------
import React, { PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<{ title?: string, footer?: React.ReactNode }>

export default function Card({ title, footer, children }: CardProps) {
  return (
    <section className="bg-stone-50 border border-black/5 rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
      {title && (
        <div className="bg-sky-500 text-white font-extrabold tracking-wide text-center py-2.5">
          {title}
        </div>
      )}
      <div className="p-4 md:p-5">
        {children}
      </div>
      {footer && (
        <div className="border-t border-black/5 p-4">
          {footer}
        </div>
      )}
    </section>
  )
}

// ---------------- src/components/Capacities.tsx ----------------
import React, { useState } from 'react'

type CapacityRow = { name: string; available: string; request?: string }

export default function Capacities() {
  const [rows, setRows] = useState<CapacityRow[]>([])
  const [newName, setNewName] = useState('')
  const [newAvail, setNewAvail] = useState('')

  const addItem = () => {
    if (!newName.trim()) return
    setRows((r) => [...r, { name: newName.trim(), available: newAvail.trim() }])
    setNewName('')
    setNewAvail('')
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div className="grid grid-cols-3 gap-3 font-semibold text-stone-700 bg-sky-50 border border-sky-200 rounded-lg p-2">
          <div>Capacity</div>
          <div className="text-center">Available</div>
          <div className="text-center">Request</div>
        </div>

        {/* inline add row */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <input
            className="px-3 py-2 rounded-lg border border-black/10 bg-white outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="Item Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-lg border border-black/10 bg-white outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="# Available"
            value={newAvail}
            onChange={(e) => setNewAvail(e.target.value)}
          />
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={addItem}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600 active:translate-y-px"
          >
            Add Item
          </button>
        </div>

        {/* table rows */}
        <div className="mt-4 space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 items-center bg-white border border-black/5 rounded-lg p-2">
              <div className="truncate font-medium">{row.name}</div>
              <div className="text-center">{row.available || '—'}</div>
              <div className="flex justify-center">
                <button className="px-3 py-1.5 rounded-md border border-sky-200 text-sky-700 hover:bg-sky-50 text-sm">
                  Request
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="text-center text-stone-500 text-sm py-3">No items yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <button className="px-3 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800">Check In</button>
        <button className="px-3 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800">Check Out</button>
      </div>
    </div>
  )
}

// ---------------- src/components/LoginForm.tsx ----------------
import React, { useState } from 'react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[login] submitted', { email, password })
    alert(`Login stub: ${email}`)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-[110px_1fr] items-center gap-3">
        <label className="text-sm text-stone-600">Email:</label>
        <input
          type="email"
          required
          className="px-3 py-2 rounded-lg border border-black/10 bg-white outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="text-sm text-stone-600">Password:</label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            required
            className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-600 hover:text-stone-900"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div className="flex justify-center">
        <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600">
          Login
        </button>
      </div>
    </form>
  )
}

// ---------------- src/components/CreateProjectForm.tsx ----------------
import React, { useState } from 'react'

export default function CreateProjectForm() {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[project] create', { name, desc })
    alert(`Create project stub: ${name}`)
    setName('')
    setDesc('')
  }

  return (
    <form onSubmit={onCreate} className="space-y-3">
      <div className="grid grid-cols-[140px_1fr] items-center gap-3">
        <label className="text-sm text-stone-600">Project Name:</label>
        <input
          className="px-3 py-2 rounded-lg border border-black/10 bg-white outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="My Hardware Build"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="text-sm text-stone-600">Description:</label>
        <input
          className="px-3 py-2 rounded-lg border border-black/10 bg-white outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Short summary"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className="flex justify-center">
        <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 text-white font-semibold shadow hover:bg-sky-600">
          Create Project
        </button>
      </div>
    </form>
  )
}

// ---------------- src/components/UseExistingProject.tsx ----------------
import React, { useState } from 'react'

export default function UseExistingProject() {
  const [pid, setPid] = useState('')

  const onUse = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[project] use-existing', { projectId: pid })
    alert(`Use existing stub: ${pid}`)
  }

  return (
    <form onSubmit={onUse} className="space-y-3">
      <div className="grid grid-cols-[110px_1fr] items-center gap-3">
        <label className="text-sm text-stone-600">Project ID:</label>
        <input
          className="px-3 py-2 rounded-lg border border-black/10 bg-white outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Enter existing Project ID"
          value={pid}
          onChange={(e) => setPid(e.target.value)}
        />
      </div>
      <p className="text-xs text-stone-500">This is a static mockup. Wire these actions to your backend when ready.</p>
      <div className="flex justify-center">
        <button type="submit" className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800">
          Load Project
        </button>
      </div>
    </form>
  )
}

// ---------------- src/index.css ----------------
// Ensure Tailwind is configured in your project
// content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"]
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Optional fine-tunes to echo the original mock’s rounded feel */
:root { color-scheme: light; }
body { @apply antialiased; }
