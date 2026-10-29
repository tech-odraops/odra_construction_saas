import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';

const mainListItems = [
  { id: 'home', text: 'Home', icon: <HomeRoundedIcon /> },
  { id: 'admins', text: 'Add Admins', icon: <PeopleRoundedIcon /> },
];

export default function MenuContent({ selectedTab = 'home', onTabSelect }) {
  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <List dense>
        {mainListItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              selected={selectedTab === item.id}
              onClick={() => onTabSelect && onTabSelect(item.id)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                '&.Mui-selected': {
                  color: 'var(--color-dashboard-nav-active-border)',
                  backgroundColor: 'var(--color-dashboard-nav-active)',
                  borderLeft: '3px solid var(--color-dashboard-nav-active-border)',
                  '&:hover': {
                    backgroundColor: 'var(--color-dashboard-nav-active)',
                  },
                },
                '& .MuiListItemIcon-root': {
                  minWidth: 36,
                  color: 'inherit',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
