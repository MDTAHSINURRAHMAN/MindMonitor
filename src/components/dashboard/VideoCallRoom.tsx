'use client';

import { useEffect, useRef } from 'react';

interface Props {
  roomId: string;
  userId: string;
  userName: string;
  onLeave?: () => void;
}

export function VideoCallRoom({ roomId, userId, userName, onLeave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const appID       = parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID ?? '0', 10);
    const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET ?? '';

    if (!appID || !serverSecret) {
      console.error('ZegoCloud credentials missing. Set NEXT_PUBLIC_ZEGO_APP_ID and NEXT_PUBLIC_ZEGO_SERVER_SECRET.');
      return;
    }

    let zp: { destroy?: () => void } | null = null;

    (async () => {
      const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        roomId,
        userId,
        userName
      );

      zp = ZegoUIKitPrebuilt.create(kitToken);
      (zp as ReturnType<typeof ZegoUIKitPrebuilt.create>).joinRoom({
        container:  containerRef.current!,
        scenario:   { mode: ZegoUIKitPrebuilt.OneONoneCall },
        onLeaveRoom: onLeave,
        showPreJoinView: false,
      });
    })();

    return () => {
      zp?.destroy?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId, userName]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden bg-gray-900"
    />
  );
}
