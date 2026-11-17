const userRoom = userId => `user-${String(userId)}`;
const projectRoom = projectId => `project-${String(projectId)}`;
const taskRoom = taskId => `task-${String(taskId)}`;

const getId = value => {
    if (value && typeof value === "object" && value._id) {
        return String(value._id);
    }

    return value == null ? null : String(value);
};

const taskParticipantIds = (project, task, additionalUserIds = []) => [
    project?.contractor,
    ...(task?.assignees || []),
    ...additionalUserIds
];

const emitToRooms = (io, eventName, payload, {
    userIds = [],
    projectId,
    taskId
} = {}) => {
    if (!io) {
        console.error(`Socket.IO unavailable; could not emit ${eventName}.`);
        return;
    }

    const rooms = new Set(
        userIds
            .map(getId)
            .filter(Boolean)
            .map(userRoom)
    );

    if (projectId != null) {
        rooms.add(projectRoom(projectId));
    }

    if (taskId != null) {
        rooms.add(taskRoom(taskId));
    }

    if (rooms.size === 0) {
        console.error(`No Socket.IO recipients were resolved for ${eventName}.`);
        return;
    }

    const [firstRoom, ...otherRooms] = rooms;
    const emitter = otherRooms.reduce(
        (currentEmitter, room) => currentEmitter.to(room),
        io.to(firstRoom)
    );

    emitter.emit(eventName, payload);
};

const removeUserFromTaskRoom = async (io, userId, taskId) => {
    if (!io) {
        console.error("Socket.IO unavailable; could not revoke task room access.");
        return;
    }

    try {
        await io
            .in(userRoom(userId))
            .socketsLeave(taskRoom(taskId));
    } catch (error) {
        console.error("Failed to revoke task room access:", error);
    }
};

const clearRoom = async (io, roomName) => {
    if (!io) {
        console.error("Socket.IO unavailable; could not clear room membership.");
        return;
    }

    try {
        await io.in(roomName).socketsLeave(roomName);
    } catch (error) {
        console.error(`Failed to clear Socket.IO room ${roomName}:`, error);
    }
};

module.exports = {
    userRoom,
    projectRoom,
    taskRoom,
    taskParticipantIds,
    emitToRooms,
    removeUserFromTaskRoom,
    clearRoom
};
