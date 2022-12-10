const net = require('net');
const colors = require('colors/safe');
const { Client } = require('./Components/Client.js');
const { InputMessage } = require('./Components/InputMessage.js');
const { OutputMessage } = require('./Components/OutputMessage.js');

let clients = new Set();

const Commands = {
    INIT: 'init',
    UPDATE: 'update',
    SNAKE_UPDATE: 'snake_update',
    PING: 'ping',
    STATUS: 'status',
    PRIVATE: 'private',
};

const server = net.createServer(socket => {
    console.log(colors.green('Somebody connected!'));
    console.log(colors.yellow('Clients:'), clients.size);

    const client = new Client(socket);

    socket.on('data', (data) => {
        // console.log(data.toString('utf-8'));
        const msg = new InputMessage();
        msg.setBuffer(data);
        const sizeSummary = msg.getU16();
        const command = msg.getString();
        const parameter = msg.getString();
        const parameter2 = msg.getString();
        const parameter3 = msg.getString();

        // TODO: move to actionManager
        if (command === Commands.INIT) {
            // TODO: REMOVE ALL PARAMETERS AFTER FIRST. IT IS BETTER TO SEND EVERYTHING SERIALIZED IN 1 PARAMETER
            // CURRENTLY parameter2, parameter3 used in Initialize?
            client.initialize(parameter, parameter2, parameter3);
            // in case if init was done again
            if (!clients.has(client)) {
                clients.add(client);
                sortClientsAlphabetically();
                console.log(colors.blue('Welcome:'), client.name);
            } else {
                console.log(colors.green('Re-Welcome:'), client.name);
            }

            const outputMessage = new OutputMessage();
            outputMessage.addString(Commands.INIT);
            outputMessage.addString(getSerializedFriends());
            outputMessage.writeMessageSize();
            broadcast(outputMessage.toBuffer(), null);

            const serializedFriends = getSerializedFriends();
            console.log('serializedFriends', serializedFriends);
        } else if (command === Commands.UPDATE) {
            // const serializedPayload = parameter.split('|');
            // const payload = {
            //     level: parameters[0],
            //     healthPercent: parameters[1],
            //     manaPercent: parameters[2],
            //     x: parameters[3],
            //     y: parameters[4],
            //     z: parameters[5],
            // };
            client.updateSerialized(parameter);

            const outputMessage = new OutputMessage();
            outputMessage.addString(Commands.UPDATE);
            outputMessage.addString(getSerializedFriendsUpdatePayload());
            outputMessage.writeMessageSize();
            socket.write(outputMessage.toBuffer());
            return;
        } else if (command === Commands.SNAKE_UPDATE) {
            broadcast(data, socket);
            return;
        } else if (command === Commands.PING) {
            broadcast(data, socket);
            return;
        } else if (command === Commands.PRIVATE) {
            // leader commands sent only to a selected mc (by id)
            const [id, privateCommand, privateParam] = parameter.split("^");
            const client = getClientById(id);
            if (client) {
                // It is creating a new private message with removed first 2 variables to satisfy bots parser.
                const privateMessage = new OutputMessage();
                privateMessage.addString(privateCommand);
                privateMessage.addString(privateParam);
                privateMessage.writeMessageSize();
                client.socket.write(privateMessage.toBuffer());
            }
        } else {
            // leader commands
            broadcast(data, socket);
        }

        // TODO: move to debug()
        // console.log("Received:", data);
        // console.log("Size Summary:", sizeSummary);
        console.log('Command:', command, '\nParameter:', parameter, '\n');
    });

    socket.on('close', () => {
        console.log(colors.red(client.name + ' has been disconnected!'));
        clients.delete(client);
        const outputMessage = new OutputMessage();
        outputMessage.addString(Commands.INIT);
        outputMessage.addString(getSerializedFriends());
        outputMessage.writeMessageSize();
        broadcast(outputMessage.toBuffer());
        console.log(colors.yellow('Clients:'), clients.size);
    });

    socket.on('error', (error) => {
        console.log(colors.red('socket error')); // always big error
        console.log(colors.yellow('Clients:'), clients.size);

        // clients.delete(client);
        // const outputMessage = new OutputMessage();
        // outputMessage.addString(Commands.INIT);
        // outputMessage.addString(getSerializedFriends());
        // outputMessage.writeMessageSize();
        // broadcast(outputMessage);
        // console.log(colors.yellow('Clients:'), clients.size);
    });
});

server.on('error', (error) => {
    console.log('server error', error);
});
server.listen(8181, '127.0.0.1');
console.log(colors.cyan('Izzaki Navigation Server!\n'));








const broadcast = (message, sender) => {
    clients.forEach(client => {
        if (client === sender) return;
        client.socket.write(message);
    });
};

const getSerializedFriends = () => {
    return Array.from(clients).map((client) => [client.id, client.name, client.role].join('|')).join(',');
};

const getSerializedFriendsUpdatePayload = () => {
    return Array.from(clients)
        .map((client) => client.serializedUpdatePayload)
        .join(',');
};

const sortClientsAlphabetically = () => {
    clients = new Set(Array.from(clients).sort((clientA, clientB) => {
        const nameA = clientA.name.toUpperCase();
        const nameB = clientB.name.toUpperCase();
        return (nameA < nameB)
            ? -1
            : (nameA > nameB)
                ? 1
                : 0;
    }));
};

const getClientById = (id) => {
    return Array.from(clients).find(client => client.id === id)
};
