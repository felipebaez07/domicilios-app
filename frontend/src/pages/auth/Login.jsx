import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

export default function Login() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post(`${import.meta.env.VITE_AUTH_URL}/login`, form)
      login(res.data)
    } catch {
      setError('Credenciales inválidas')
    }
  }

  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div style={{ width:360, padding:32, border:'1px solid #eee', borderRadius:12 }}>
        <h2 style={{ marginBottom:24 }}>Domicilios App</h2>
        {error && <p style={{ color:'red', marginBottom:12 }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            style={{ width:'100%', padding:10, marginBottom:12, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            style={{ width:'100%', padding:10, marginBottom:16, borderRadius:6, border:'1px solid #ddd', boxSizing:'border-box' }}
          />
          <button type="submit" style={{ width:'100%', padding:10, background:'#333', color:'#fff', borderRadius:6, border:'none', cursor:'pointer' }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}