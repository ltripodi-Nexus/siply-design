import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* `reducedMotion="user"` disattiva gli spostamenti (non i fade) per chi ha
        chiesto meno animazioni nelle impostazioni di sistema: requisito di
        accessibilità, e vale per tutta l'app da qui. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
