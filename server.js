
require('dotenv').config();

const express = require('express');
const authRoute = require('./routes/auth');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('./database');

const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true
});

const roomSet = new Map();
const boardroomSet = new Map();

app.use('/peerjs', peerServer);
app.use(express.json());
app.use(express.urlencoded({extended : false}));
app.use(cookieParser());
app.use(express.static('public'));
app.set('view-engine' , 'ejs');

app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : false
}));

const PORT = process.env.PORT || 3000;

app.use(authRoute);

app.use((req , res , next) => {
    const userDB = req.session.user;
    if (userDB)
    {
        if (userDB.verified){
            next();
        }
        else{
            return res.redirect('/verify');
        }
    }
    else{
        return res.redirect('/login');
    }
});

app.get('/' , (req, res) => {
    res.render("index.ejs" , {name: req.session.user.name});
});

app.get('/call', (req, res) => {
    const roomId = uuidV4();
    roomSet.set(roomId , [0 , null]);
    res.redirect(`/call/${roomId}`)
});

app.get('/whiteboard' , (req , res) => {
    const boardId = uuidV4();
    boardroomSet.set(boardId , [0 , req.session.user.email, null]);
    res.redirect(`/whiteboard/${boardId}`);
});

app.post('/joincall' , (req , res) => {
    return res.redirect(`/call/${req.body.code}`);
});

app.post("/joinboard" , (req , res) => {
    return res.redirect(`/whiteboard/${req.body.code}`);
});

app.get('/call/:room', (req, res) => {
    const roomId = req.params.room;
    if(roomSet.has(roomId)){
        res.render('room.ejs', { roomId , name : req.session.user.name});
    }
    else{
        res.status(404).render('notfound.ejs' , {msg : "Room invalid / expired!"});
    }
});

app.get('/whiteboard/:room', (req, res) => {
    const roomId = req.params.room;
    if (boardroomSet.has(roomId)){
        if (boardroomSet.get(roomId)[1] == req.session.user.email) return res.render("whiteboard-admin.ejs" , {roomId , name : req.session.user.name});
        res.render("whiteboard.ejs" , {roomId , name : req.session.user.name});
    }
    else res.status(404).render('notfound.ejs' , {msg : "Board invalid / expired!"});
});

app.get('*' , (req , res)=> {
    return res.status(404).render('notfound.ejs' , {msg : null});
});

io.on('connect', socket => {
    // Video call
    socket.on('join-room', (roomId, userId, userName) => {
        socket.join(roomId);
        const id = roomSet.get(roomId)[1];
        if (id) clearTimeout(id);
        roomSet.set(roomId , [roomSet.get(roomId)[0] + 1 , null]);
        socket.broadcast.to(roomId).emit('user-connected', userId, userName, socket.id);
        socket.on('message', (username, message) => {
            socket.to(roomId).emit('message', username, message);
        });
        socket.on('disconnect', () => {
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
            roomSet.set(roomId , [roomSet.get(roomId)[0] - 1 , null]);
            if (roomSet.get(roomId)[0] <= 0){
                const id = setTimeout(()=>{roomSet.delete(roomId);} , 3600000);
                roomSet.set(roomId , [0 , id]);
            }
            console.log(`${userName} left`);
        });
    });
    socket.on('username-sent', (socketId, userId, userName) => {
        socket.broadcast.to(socketId).emit('username-received', userId, userName);
    });

    // Whiteboard
    socket.on('join-board' , (roomId , name) => {
        socket.join(roomId);
        const id = boardroomSet.get(roomId)[2];
        if (id) clearTimeout(id);
        boardroomSet.set(roomId , [boardroomSet.get(roomId)[0] + 1 , boardroomSet.get(roomId)[1] , null]);
        socket.broadcast.to(roomId).emit("notify", name);
        socket.on("draw" , (data) => {
            boardroomSet.set(roomId , [boardroomSet.get(roomId)[0] , boardroomSet.get(roomId)[1]]);
            socket.broadcast.to(roomId).emit('ondraw' , {startX : data.startX , startY : data.startY, x : data.x ,y : data.y, width: data.width , color: data.color});
        });
        socket.on("clearscreen" , ()=> {
            socket.broadcast.to(roomId).emit('clear');
        });
        socket.on('disconnect', () => {
            boardroomSet.set(roomId , [boardroomSet.get(roomId)[0] - 1 , boardroomSet.get(roomId)[1] , null]);
            if (boardroomSet.get(roomId)[0] <= 0){
                const id = setTimeout(()=> {boardroomSet.delete(roomId);} , 3600000);
                boardroomSet.set(roomId , [0 , boardroomSet.get(roomId)[1] ,  id]);
            }
        });

    });
});

server.listen(PORT , () => {
    console.log(`Listening on PORT ${PORT}`);
});

