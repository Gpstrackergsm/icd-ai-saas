import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants/Config';

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        console.log('[useSocket] Initializing socket connection to:', API_URL);

        const socketIo = io(API_URL, {
            transports: ['websocket'],
        });

        socketIo.on('connect', () => {
            console.log('[useSocket] Socket connected successfully!');
        });

        socketIo.on('disconnect', (reason) => {
            console.log('[useSocket] Socket disconnected:', reason);
        });

        socketIo.on('connect_error', (error) => {
            console.error('[useSocket] Connection error:', error.message);
        });

        setSocket(socketIo);

        return () => {
            console.log('[useSocket] Disconnecting socket');
            socketIo.disconnect();
        };
    }, []);

    return socket;
};
