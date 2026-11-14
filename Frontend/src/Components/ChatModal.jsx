
import * as React from 'react';
import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Modal from '@mui/material/Modal';
import axiosInstance from "../utils/axiosInstance";
import ProjectChat from './ProjectChat';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Button from './atoms/Button/Button';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: "90vw",
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  borderRadius: "2em",
  p: 4,
};

export default function ChatModal({
  projectId,
  showIcon = false,
  socket,
  buttonLabel = "Chat",
  buttonClassName = "",
  buttonSx = {},
  buttonStyle = {},
}) {

  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Fetch unread message count
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

  // Mark messages as read
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

    if (!socket) return;

    const handleNewMessage = async () => {

      // Modal is open: mark messages as read
      if (open) {
        await markAsRead();
      } 
      // Modal is closed: update unread count
      else {
        fetchUnreadCount();
      }
    };

    socket.on("chat:new", handleNewMessage);

    // Periodically refresh unread count
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
    await markAsRead();
    setOpen(false);
  };

  return (
    <div>
      <Badge badgeContent={unreadCount} color="error">

        <Button
          className={buttonClassName}
          onClick={handleOpen}
          variant="contained"
          color="primary"
          size="small"
          startIcon={
            showIcon ? <ChatBubbleOutlineIcon /> : undefined
          }
          sx={{
            borderRadius: 5,
            padding: 0,
            ...buttonSx
          }}
          style={buttonStyle}
          border={false}
        >
          {buttonLabel}
        </Button>

      </Badge>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <ProjectChat
            projectId={projectId}
            onMessageSent={markAsRead}
            socket={socket}
          />
        </Box>
      </Modal>

    </div>
  );
}
