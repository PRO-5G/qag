const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Храним пользователей в памяти
let users = [];

// Раздаем статические файлы
app.use(express.static('.'));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API для регистрации/входа
app.use(express.json());
app.post('/api/auth', (req, res) => {
    const { username, password, action } = req.body;
    
    if (action === 'register') {
        const existingUser = users.find(u => u.username === username);
        if (existingUser) return res.json({ success: false, error: 'Username exists' });
        
        const newUser = { id: generateId(), username, password, online: false };
        users.push(newUser);
        res.json({ success: true, userId: newUser.id });
        
    } else if (action === 'login') {
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) return res.json({ success: false, error: 'Wrong login/pass' });
        
        user.online = true;
        res.json({ success: true, userId: user.id });
    }
});

// WebSocket соединения
io.on('connection', (socket) => {
    console.log('User connected');
    
    socket.on('user_online', (userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            user.socketId = socket.id;
            user.online = true;
        }
    });
    
    socket.on('send_message', (data) => {
        const receiver = users.find(u => u.id === data.toUserId);
        if (receiver && receiver.socketId) {
            io.to(receiver.socketId).emit('new_message', data);
        }
        // Отправляем обратно отправителю
        socket.emit('new_message', data);
    });
});

function generateId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

server.listen(5000, () => {
    console.log('🚀 Qag server running on http://localhost:5000');
});
