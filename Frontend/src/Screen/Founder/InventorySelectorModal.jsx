import React from "react";
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SearchIcon from "@mui/icons-material/Search";

const getMemberName = (member) =>
  typeof member === "string" ? member : member?.name || "Team member";

export default function InventorySelectorModal({
  open,
  onClose,
  projectName,
  locations,
  selectedLocationId,
  onSelectLocation,
  inventoryCategory,
  onCategoryChange,
  search,
  onSearchChange,
  members,
  membersLoading,
  memberLoadError,
  memberInventoryMessage,
  onSelectProjectInventory,
  onSelectMember
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredMembers = members.filter((member) =>
    getMemberName(member).toLowerCase().includes(normalizedSearch)
  );
  const otherLocations = locations.filter((location) =>
    String(location._id) !== String(selectedLocationId)
    && location.name.toLowerCase().includes(normalizedSearch)
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: "var(--dashboard-container-radius)",
          p: 0.5
        }
      }}
    >
      <DialogTitle sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pb: 0.5,
        fontWeight: "var(--font-weight-bold)"
      }}>
        Select Material Inventory
        <IconButton aria-label="Close inventory selector" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 1.5, pb: 1.5 }}>
        <Typography variant="body2" sx={{ mb: 1.25, color: "var(--color-organization-profile-text)" }}>
          In {projectName}
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search materials..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        <List disablePadding>
          <ListItemButton
            onClick={onSelectProjectInventory}
            sx={{
              mb: 1.5,
              borderRadius: "var(--dashboard-container-radius)",
              bgcolor: "var(--color-organization-profile-avatar-surface)",
              color: "var(--palette-primary-main)",
              "&:hover": { bgcolor: "var(--color-organization-profile-avatar-surface)" }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
              <Box sx={{
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                borderRadius: 1,
                bgcolor: "var(--palette-background-paper)"
              }}>
                <Inventory2OutlinedIcon fontSize="small" />
              </Box>
            </ListItemIcon>
            <ListItemText
              primary="Project Inventory"
              primaryTypographyProps={{ fontWeight: "var(--font-weight-bold)" }}
            />
            <CheckIcon fontSize="small" />
          </ListItemButton>
          {otherLocations.map((location) => (
            <ListItemButton
              key={location._id}
              onClick={() => onSelectLocation(location._id)}
              sx={{ borderRadius: "var(--dashboard-container-radius)" }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "var(--color-dashboard-muted-text)" }}>
                <Inventory2OutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={location.name} secondary="Project Inventory" />
            </ListItemButton>
          ))}
        </List>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 1,
            px: 1,
            color: "var(--color-dashboard-muted-text)",
            fontWeight: "var(--font-weight-bold)"
          }}
        >
          OTHER INVENTORIES
        </Typography>
        <Box sx={{ display: "flex", gap: 0.75, px: 1, mb: 1 }}>
          {["Subcontractor", "Team Member"].map((category) => (
            <Chip
              key={category}
              label={category}
              size="small"
              onClick={() => onCategoryChange(category)}
              variant={inventoryCategory === category ? "filled" : "outlined"}
              sx={{
                fontWeight: "var(--font-weight-semibold)",
                color: inventoryCategory === category
                  ? "var(--palette-primary-main)"
                  : "var(--color-dashboard-muted-text)",
                bgcolor: inventoryCategory === category
                  ? "var(--color-organization-profile-avatar-surface)"
                  : "transparent",
                borderColor: "var(--color-dashboard-border)"
              }}
            />
          ))}
        </Box>

        {memberInventoryMessage && (
          <Typography role="status" variant="caption" sx={{ display: "block", px: 1, mb: 1, color: "var(--color-dashboard-muted-text)" }}>
            {memberInventoryMessage}
          </Typography>
        )}
        {inventoryCategory === "Team Member" && (
          <>
            {membersLoading && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
                Loading team members...
              </Typography>
            )}
            {memberLoadError && (
              <Typography role="alert" variant="body2" color="error" sx={{ px: 1, py: 1 }}>
                {memberLoadError}
              </Typography>
            )}
            {!membersLoading && !memberLoadError && filteredMembers.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
                No team members found.
              </Typography>
            )}
            {!membersLoading && !memberLoadError && filteredMembers.map((member) => {
              const name = getMemberName(member);
              const key = typeof member === "string" ? member : member._id || name;
              return (
                <ListItemButton
                  key={key}
                  onClick={() => onSelectMember(member)}
                  sx={{ borderRadius: "var(--dashboard-container-radius)" }}
                >
                  <ListItemIcon sx={{ minWidth: 44 }}>
                    <Avatar sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "var(--color-organization-profile-avatar-surface)",
                      color: "var(--color-organization-profile-text)",
                      fontSize: "var(--font-caption-font-size)"
                    }}>
                      {name.slice(0, 1).toUpperCase()}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText primary={name} />
                </ListItemButton>
              );
            })}
          </>
        )}
        {inventoryCategory === "Subcontractor" && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>
            No subcontractor inventories are available for this project.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
