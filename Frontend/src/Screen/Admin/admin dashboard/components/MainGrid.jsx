import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Copyright from '../internals/components/Copyright';
import UserGrowthChart from './UserGrowthChart';
import StatCard from './StatCard';
import axiosInstance from "../../../../utils/axiosInstance"
import { useState,useEffect } from 'react';
import Box from "@mui/material/Box"

export default function MainGrid() {

  const [dashboardData, setDashboardData] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);

  useEffect(() => {
  async function fetchAll() {
    try {
      const dash = await axiosInstance.get("/admin/dashboard");
      setDashboardData(dash.data);

      const users = await axiosInstance.get("/admin/user-growth");
      setUserGrowth(users.data.data);

    } catch (err) {
      console.log(err);
    }
  }

  fetchAll();
}, []);

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>

      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
        Overview
      </Typography>

      <Grid container spacing={2} columns={12} sx={{ mb: (theme) => theme.spacing(2) }} >

        {/* KPI cards */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Total Users"
            value={dashboardData?.totalUsers}
            interval="Total Users"
            trend="up"
            data={userGrowth.map(item => item.users)}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Total Orgs"
            value={dashboardData?.totalOrganizations}
            interval="Total Orgs"
            trend="up"
            data={userGrowth.map(item => item.users)}
          />
        </Grid>


        {/* Charts */}
        <Grid size={{ xs: 12, md: 6 }}>
          <UserGrowthChart data={userGrowth} />
        </Grid>

      </Grid>
      <Copyright sx={{ my: 4 }} />
    </Box>
  );
}
