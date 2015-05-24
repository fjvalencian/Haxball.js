/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/socket.io/socket.io.d.ts" />
'use strict';
var io = require('socket.io').listen(3000);

io.sockets.on('connection', function( socket ) {
    console.log('Polaczona!');
    socket.on('message', function ( from, msg ) {
        console.log( 'I received a private message by', from, 'saying,', msg );
    });
});