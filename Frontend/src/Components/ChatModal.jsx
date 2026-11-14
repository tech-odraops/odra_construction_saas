import * as React from 'react';
import Box from '@mui/material/Box';
import Button from './atoms/Button/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Badge from '@mui/material/Badge';
import axiosInstance from "../utils/axiosInstance";
import ProjectChat from './ProjectChat';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: "90vw",
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  borderRadius:"2em",
  p: 4,
};

export default function ChatModal({projectId, showIcon = false, socket}) {
  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axiosInstance.get(
        `/chat/${projectId}/unread`
      );
      setUnreadCount(res.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axiosInstance.post(
        `/chat/${projectId}/read`,
        {}
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  React.useEffect(() => {
    if (!projectId) return;

    fetchUnreadCount();

    if (!socket) return undefined;

    const handleNewMessage = async () => {
      // If modal is open, mark the message as read immediately
      if (open) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            // Mark this specific message as read using axiosInstance
            await axiosInstance.post(
              `/chat/${projectId}/read`,
              {}
            );
            setUnreadCount(0);
          }
        } catch (error) {
          console.error('Failed to mark message as read:', error);
        }
      } else {
        // If modal is closed, update unread count
        fetchUnreadCount();
      }
    };
    socket.on("chat:new", handleNewMessage);

    // Refresh unread count periodically (only when modal is closed)
    const interval = setInterval(() => {
      if (!open) {
        fetchUnreadCount();
      }
    }, 5000);

    return () => {
      socket.off("chat:new", handleNewMessage);
      clearInterval(interval);
    };
  }, [projectId, open, socket]);

  const handleOpen = () => {
    setOpen(true);
    markAsRead();
  };

  const handleClose = async () => {
    // Mark all messages as read before closing (to catch any missed ones)
    await markAsRead();
    setOpen(false);
    // Small delay to ensure markAsRead completes, then refresh count
    setTimeout(() => {
      fetchUnreadCount();
    }, 100);
  };

  return (
    <div>
      <Badge badgeContent={unreadCount} color="error">
        <Button onClick={handleOpen} variant="contained" color="primary" size="small" startIcon={showIcon ? <ChatBubbleOutlineIcon /> : undefined} sx={{ borderRadius: 10 , padding: 1 ,margin: 1}}>Chat</Button>
      </Badge>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <ProjectChat projectId={projectId} onMessageSent={markAsRead} socket={socket} />
        </Box>
      </Modal>
    </div>
  );
}
