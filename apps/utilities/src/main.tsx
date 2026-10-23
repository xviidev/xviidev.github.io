import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import UtilityApp from './components/UtilityApp'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Elemen aplikasi tidak ditemukan.')
createRoot(root).render(<StrictMode><UtilityApp /></StrictMode>)
