import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import AppNavbar from './components/AppNavbar';
import Header from './components/Header';
import MainGrid from './components/MainGrid';
import SideMenu from './components/SideMenu';

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState('home');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'var(--color-dashboard-canvas)',
        p: { xs: 0, md: 2 },
      }}
    >
      <AppNavbar selectedTab={selectedTab} onTabSelect={setSelectedTab} />
      <Header selectedTab={selectedTab} />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 'var(--dashboard-gap)',
          mt: { xs: 'calc(var(--dashboard-header-height) + var(--dashboard-gap))', md: 'var(--dashboard-gap)' },
          minHeight: 'var(--dashboard-content-min-height)',
        }}
      >
        <SideMenu selectedTab={selectedTab} onTabSelect={setSelectedTab} />
        <Paper
          component="main"
          elevation={0}
          sx={{
            flexGrow: 1,
            minWidth: 0,
            overflow: 'auto',
            border: '1px solid var(--color-dashboard-border)',
            borderRadius: 'var(--dashboard-container-radius)',
            bgcolor: 'var(--color-dashboard-surface)',
            p: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {selectedTab === 'home' && <MainGrid />}
          {selectedTab === 'admins' && (
            <Box sx={{ width: '100%', maxWidth: 'var(--dashboard-content-max-width)' }}>
              <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Admin Management
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Manage system administrators, invitations, and role privileges.
                </Typography>
              </Paper>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
