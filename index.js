// Libraray
const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Instances
const app = express();
const server = http.createServer(app);
const io = socketio(server, { cors: { origin: '*' } });

app.use(cors());

// End point
app.get('/', (req, res) => {
  res.json('Api is working');
});

let users = [];

const addUser = ({ id, user, room }) => {
  user = user?.trim().toLowerCase();
  room = room?.trim().toLowerCase();

  if (!user || !room) {
    return { error: 'Name and room required' };
  }

  if (users.length) {
    const data = users.find((e) => e.user === user && e.room === room);
    if (data) {
      return { error: 'User already exist' };
    }
  }

  const response = { id, user, room };

  users.push(response);

  console.log(users);

  return { response };
};

const removeUser = (id) => {
  const findIdx = users.findIndex((e) => e.id == id);

  if (findIdx >= 0) {
    return users.splice(findIdx, 1)[0];
  }
};

const getUser = (id) => {
  return users.find((e) => e.id == id);
};

const getRoomUsers = (room) => {
  return users.filter((e) => e.room === room);
};
//xong rồi tui out nha. oke ông
//Secrect token 14022000

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const verifyToken = await jwt.verify(token, '14022000');
      if (verifyToken) next();
      else next(new Error('invalid token'));
    } catch (error) {
      next(new Error('error server'));
    }
  } else {
    next(new Error('token must not empty'));
  }
});

io.on('connect', (socket, error) => {
  if (!error) {
    socket.on('join', ({ user, room }, callback) => {
      console.log(user, room);
      const { response, error } = addUser({
        id: socket.id,
        user: user,
        room: room,
      });

      console.log(response);

      if (error) {
        callback(error);
        return;
      }
      socket.join(response.room);
      socket.emit('message', {
        user: 'admin',
        text: `Welcome ${response.user}`,
      });
      socket.broadcast.to(response.room).emit('message', {
        user: 'admin',
        text: `${response.user} has joined`,
      });

      io.to(response.room).emit('roomMembers', getRoomUsers(response.room));
    });

    socket.on('sendMessage', (message, callback) => {
      const user = getUser(socket.id);

      io.to(user.room).emit('message', { user: user.user, text: message });

      callback();
    });

    //send and get message
    socket.on('sendMessage', (message, callback) => {
      const user = getUser(socket.id);

      io.to(user.socketId).emit('message', { user: user.user, text: message });

      callback();
    });

    //when disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected');
      const user = removeUser(socket.id);

      if (user) {
        io.to(user.room).emit('message', {
          user: 'admin',
          text: `${user.user} has left`,
        });
      }
    });
  } else console.log(error.toString());
});
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log('Server started on 8000'));
