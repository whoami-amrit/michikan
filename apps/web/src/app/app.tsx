import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@/components/ui/tooltip';
import { MainContextProvider } from '@/lib/contexts/main/provider';

import Layout from './layout';

const AuthPage = lazy(() => import('./auth'));
const JobsPage = lazy(() => import('./jobs'));
const AnalysisPage = lazy(() => import('./analysis'));
const ResumesPage = lazy(() => import('./resumes'));
const UserPage = lazy(() => import('./user'));

function App() {
  return (
    <main>
      <Toaster />
      <MainContextProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Suspense>
              <AuthPage />
              <Layout>
                <Routes>
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/analysis" element={<AnalysisPage />} />
                  <Route path="/resumes" element={<ResumesPage />} />
                  <Route path="/user" element={<UserPage />} />
                </Routes>
              </Layout>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </MainContextProvider>
    </main>
  );
}

export default App;
