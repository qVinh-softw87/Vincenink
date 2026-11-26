#!/bin/bash
# Mở Vincenink tại http://localhost:8080 (đóng cửa sổ Terminal này để tắt)
cd "$(dirname "$0")"
PORT=8080
if lsof -i :$PORT >/dev/null 2>&1; then
  open "http://localhost:$PORT"
  exit 0
fi
echo "Vincenink đang chạy tại http://localhost:$PORT"
echo "Đóng cửa sổ này khi dạy xong."
(sleep 1; open "http://localhost:$PORT") &
python3 -m http.server $PORT --bind 127.0.0.1
