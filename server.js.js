const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Cho phép kết nối Socket.io từ trình duyệt / domain khác nếu cần
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Phục vụ toàn bộ file giao diện tĩnh trong thư mục public/
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Trả về index.html khi người dùng truy cập trang gốc
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Lưu tạm tối đa 100 tin nhắn gần nhất trên RAM
const MAX_HISTORY = 100;
let forumHistory = [];

function pushHistory(msgObj) {
    forumHistory.push(msgObj);
    if (forumHistory.length > MAX_HISTORY) {
        forumHistory.shift();
    }
}

io.on('connection', (socket) => {
    // Gửi lịch sử chat hiện có cho người mới kết nối
    socket.emit('forum_history', forumHistory);

    // Khi người dùng nhập tên hoặc cập nhật tên
    socket.on('forum_join', (data = {}) => {
        const cleanName = String(data.username || '').trim().slice(0, 30);
        if (cleanName) {
            socket.data.username = cleanName;
        }
    });

    // Nhận tin nhắn mới từ một client và phát cho tất cả mọi người
    socket.on('forum_message', (payload = {}) => {
        const text = String(payload.text || '').trim();
        if (!text) return;

        const sender = String(payload.sender || socket.data.username || 'Học sinh').trim().slice(0, 30);
        const type = payload.type === 'system' ? 'system' : 'chat';
        const createdAtMs = Number(payload.createdAtMs) || Date.now();
        const timeStr =
            payload.timeStr ||
            new Date(createdAtMs).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });

        if (sender && type === 'chat') {
            socket.data.username = sender;
        }

        const msgObj = {
            type,
            sender,
            text,
            timeStr,
            createdAtMs
        };

        pushHistory(msgObj);
        io.emit('forum_message', msgObj);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Review Unit 4 Socket.io server running at http://localhost:${PORT}`);
});