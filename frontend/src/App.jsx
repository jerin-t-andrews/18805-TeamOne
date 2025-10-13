import { useState } from 'react'
import './App.css'
import Navbar from './componenets/Navbar'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Navbar/>
      <div>
      </div>
    </>
  )
}

export default App
