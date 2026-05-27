import { useEffect, useRef, useState, useCallback } from 'react';

export interface RematchVoteUpdate {
  voterIds: string[];
  countdownEndsAt: number | null;
  sessionStats: Record<string, { wins: number; losses: number; ties: number; playerName: string }>;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

type WebSocketHookParams = {
  roomId: string;
  sessionToken: string;
  onStateUpdate?: (state: any) => void;
  onGameStarted?: () => void;
  onPlayerJoined?: (player: any) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayerKicked?: (playerId: string) => void;
  onNavigate?: (path: string) => void;
  onRematchVoteUpdate?: (data: RematchVoteUpdate) => void;
  onRematchStarted?: (state: any, sessionStats: RematchVoteUpdate['sessionStats']) => void;
  onRematchCancelled?: () => void;
  onRematchDeclined?: (sessionStats: RematchVoteUpdate['sessionStats']) => void;
  onChatMessage?: (msg: ChatMessage) => void;
};

export function useGameWebsocket({
  roomId,
  sessionToken,
  onStateUpdate,
  onGameStarted,
  onPlayerJoined,
  onPlayerLeft,
  onPlayerKicked,
  onNavigate,
  onRematchVoteUpdate,
  onRematchStarted,
  onRematchCancelled,
  onRematchDeclined,
  onChatMessage,
}: WebSocketHookParams) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000);
  const MAX_RECONNECT_DELAY = 16000;

  const onStateUpdateRef = useRef(onStateUpdate);
  const onGameStartedRef = useRef(onGameStarted);
  const onPlayerJoinedRef = useRef(onPlayerJoined);
  const onPlayerLeftRef = useRef(onPlayerLeft);
  const onPlayerKickedRef = useRef(onPlayerKicked);
  const onNavigateRef = useRef(onNavigate);
  const onRematchVoteUpdateRef = useRef(onRematchVoteUpdate);
  const onRematchStartedRef = useRef(onRematchStarted);
  const onRematchCancelledRef = useRef(onRematchCancelled);
  const onRematchDeclinedRef = useRef(onRematchDeclined);
  const onChatMessageRef = useRef(onChatMessage);

  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate;
    onGameStartedRef.current = onGameStarted;
    onPlayerJoinedRef.current = onPlayerJoined;
    onPlayerLeftRef.current = onPlayerLeft;
    onPlayerKickedRef.current = onPlayerKicked;
    onNavigateRef.current = onNavigate;
    onRematchVoteUpdateRef.current = onRematchVoteUpdate;
    onRematchStartedRef.current = onRematchStarted;
    onRematchCancelledRef.current = onRematchCancelled;
    onRematchDeclinedRef.current = onRematchDeclined;
    onChatMessageRef.current = onChatMessage;
  });

  const connect = useCallback(() => {
    if (!sessionToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?roomId=${roomId}&sessionToken=${sessionToken}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = 1000;
      // Keep the connection alive through Replit's proxy by sending a ping
      // every 20 s.  The server responds with a pong (no-op on the client).
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 10_000);
      ws.addEventListener('close', () => clearInterval(pingInterval), { once: true });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'state_update':
            onStateUpdateRef.current?.(data.state);
            break;
          case 'game_started':
            onGameStartedRef.current?.();
            break;
          case 'player_joined':
            onPlayerJoinedRef.current?.(data.player || { id: data.playerId, name: data.playerName, isConnected: false });
            break;
          case 'player_connected':
            onPlayerJoinedRef.current?.({ id: data.playerId, name: data.playerName, isConnected: true });
            break;
          case 'player_left':
          case 'player_disconnected':
            onPlayerLeftRef.current?.(data.playerId);
            break;
          case 'player_kicked':
            onPlayerKickedRef.current?.(data.playerId);
            onPlayerLeftRef.current?.(data.playerId);
            break;
          case 'rematch_vote_update':
            onRematchVoteUpdateRef.current?.({
              voterIds: data.voterIds ?? [],
              countdownEndsAt: data.countdownEndsAt ?? null,
              sessionStats: data.sessionStats ?? {},
            });
            break;
          case 'rematch_started':
            // Treat like a state update (new game) + pass along session stats
            onStateUpdateRef.current?.(data.state);
            onRematchStartedRef.current?.(data.state, data.sessionStats ?? {});
            break;
          case 'rematch_cancelled':
            onRematchCancelledRef.current?.();
            break;
          case 'rematch_declined':
            onRematchDeclinedRef.current?.(data.sessionStats ?? {});
            break;
          case 'chat_message':
            onChatMessageRef.current?.({
              playerId: data.playerId,
              playerName: data.playerName,
              text: data.text,
              timestamp: data.timestamp,
            });
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY);
      }, reconnectDelayRef.current);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
      ws.close();
    };
  }, [roomId, sessionToken]);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendChatMessage = useCallback((text: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat_message', text }));
    }
  }, []);

  return { isConnected, sendChatMessage };
}
