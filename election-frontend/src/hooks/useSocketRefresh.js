import { useEffect } from "react";
import { socket } from "../socket";

export function useSocketRefresh(type, onRefresh) {
  useEffect(() => {
    if (!onRefresh) return;

    const handler = (data) => {
      if (!type || data?.type === type) {
        onRefresh();
      }
    };

    socket.on("dataChanged", handler);
    return () => socket.off("dataChanged", handler);
  }, [type, onRefresh]);
}
