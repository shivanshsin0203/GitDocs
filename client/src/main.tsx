import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Route, Routes } from 'react-router'
import Test from './Test.tsx'
import Dashboard from './Dashboard.tsx'
import ListRepos from './ListRepos.tsx'
import AuthError from './AuthError.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { JobStreamProvider } from './hooks/useJobStream.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastContainer 
          position="top-center"
          autoClose={3000}
          hideProgressBar={true}
          closeButton={false}
          toastClassName={() => "bg-[#0d1117] text-[#e2e2e2] font-sans text-sm border border-white/10 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] flex p-4 mb-4 relative overflow-hidden items-center w-max mx-auto"}
        />
        <JobStreamProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path='/test' element={<Test/>}/>
            <Route path='/dashboard' element={<Dashboard/>}/>
            <Route path='/listrepos' element={<ListRepos/>}/>
            <Route path='/auth/error' element={<AuthError/>}/>
          </Routes>
        </JobStreamProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
