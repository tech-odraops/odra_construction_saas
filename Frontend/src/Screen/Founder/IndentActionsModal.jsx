import { Box, Dialog, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import ReplyIcon from "@mui/icons-material/Reply";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function IndentActionsModal({ open, indent, onClose, onMarkClosed, onShare, onEdit, onDelete }) {
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { width: 270, maxWidth: "calc(100% - 32px)", m: 1, p: 1.5, borderRadius: 3 } }}>
      {indent && <>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.25 }}>
          <Box>
            <Typography sx={{ fontWeight: "var(--font-weight-bold)", lineHeight: 1.3 }}>Indent Actions</Typography>
            <Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>{indent.id}</Typography>
          </Box>
          <IconButton aria-label="Close indent actions" size="small" onClick={onClose} sx={{ bgcolor: "var(--gray-100)", borderRadius: 1 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <Box sx={{ display: "grid" }}>
          <ActionRow icon={<CheckIcon />} label="Mark as Closed" tone="success" onClick={onMarkClosed} />
          <ActionRow icon={<ReplyIcon />} label="Share" onClick={onShare} />
          <ActionRow icon={<EditIcon />} label="Edit and Create Revision" onClick={onEdit} />
          <ActionRow icon={<DeleteIcon />} label="Delete" tone="danger" onClick={onDelete} />
        </Box>
      </>}
    </Dialog>
  );
}

function ActionRow({ icon, label, tone, onClick }) {
  const success = tone === "success";
  const danger = tone === "danger";
  return (
    <Box component="button" onClick={onClick} sx={{ minHeight: 38, width: "100%", display: "flex", alignItems: "center", gap: 1, px: 1, my: 0.25, border: 0, borderBottom: tone ? 0 : "1px solid var(--color-dashboard-border)", borderRadius: tone ? 1.5 : 0, bgcolor: success ? "var(--color-status-chip-completed-background)" : danger ? "var(--palette-error-light)" : "transparent", color: success ? "var(--color-status-chip-completed-text)" : danger ? "var(--palette-error-main)" : "var(--color-organization-profile-text)", textAlign: "left", font: "inherit", fontSize: "var(--font-caption-font-size)", fontWeight: "var(--font-weight-semibold)", cursor: "pointer", "&:hover": { bgcolor: success ? "var(--color-status-chip-completed-background)" : danger ? "var(--palette-error-light)" : "var(--gray-100)" }, "& svg": { fontSize: "var(--icon-sm)" } }}>
      {icon}<span>{label}</span>
    </Box>
  );
}
